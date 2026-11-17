const test=require('node:test'),assert=require('node:assert/strict');
const {groupSessions,sessionAccess}=require('../services/physioAgenda');
const {physioRead}=require('../../integrations/stenci/physioRead');
const {operationKey}=require('../services/transientStenciService');
const date='2026-11-11',at=time=>date+'T'+time+':00-03:00';
const appointment=(id,time)=>({id,patient_name:'Paciente de teste',startDate:at(time),status:'scheduled'});
const snapshot=(slots,items,id='agenda-a')=>({scheduleId:id,scheduleName:id,slots:slots.map(time=>({startDate:at(time)})),items});
test('minute positions form sessions, including vacant positions and changing intervals',()=>{
 const sessions=groupSessions([snapshot(['13:00','13:01','13:02','13:03','13:04','13:05','13:45','13:46','14:45','14:46'],[appointment('one','13:00'),appointment('two','13:02'),appointment('three','13:05'),appointment('four','13:46'),appointment('five','14:45')])],date);
 assert.equal(sessions.length,3);assert.deepEqual(sessions.map(s=>[s.start_time,s.end_time]),[['13:00','13:45'],['13:45','14:45'],['14:45','15:45']]);
 assert.deepEqual(sessions[0].items.map(p=>p.id),['one','two','three']);assert.equal(sessions[2].end_estimated,true);assert.equal(sessions[2].end_source,'previous_interval');
 assert.equal(sessions[0].end_estimated,false);assert.deepEqual(sessions.map(s=>s.number),[1,2,3]);
});
test('sessions respect agendas, timezone, duplicate appointments, empty groups and the final estimate',()=>{
 const a=snapshot(['13:00','13:01','13:45','13:46','14:30'],[appointment('shared','13:01'),appointment('last','14:30')]);
 const b=snapshot(['13:00','13:01'],[appointment('shared','13:01'),appointment('other','13:00')],'agenda-b');
 const sessions=groupSessions([a,b],date);assert.equal(sessions.length,3);assert.deepEqual(sessions.map(s=>s.items.length),[1,1,1]);assert.equal(sessions[0].end_time,'13:45');assert.equal(sessions[2].end_time,'15:15');
 const singleton=groupSessions([snapshot([], [{...appointment('late','23:45'),startDate:'2026-11-12T02:45:00Z'}])],date)[0];assert.equal(singleton.start_time,'23:45');assert.equal(singleton.end_time,'00:30');assert.equal(singleton.end_next_day,true);assert.equal(singleton.end_source,'default_45');
 assert.deepEqual(groupSessions([],date),[]);assert.deepEqual(groupSessions([snapshot(['13:00','13:01'],[])],date),[]);
});
test('physio calendar uses the existing read contract and selects only appointment fields needed by the tablet',async()=>{
 const calls=[];let hasMore=false;
 const client={assertAuthenticated(){},async request(path,options){calls.push({path,options});return{hasMore,items:[{id:'one',startDate:at('13:00'),endDate:at('13:01'),patient:{id:'patient',name:'Paciente',birthDate:'1990-01-01',identity:{value:'do-not-cache'},phone:'do-not-cache'},status:'confirmed',notes:'do-not-cache',expenses:[{expense:{name:'Sessão',code:'50000160',type:'session'},quantity:1}],meta:{private:'do-not-cache'}},{isSlot:true,startDate:at('13:01'),status:'available'}]}}};
 const result=await physioRead(client,{date,scheduleId:'a'.repeat(32)});
 assert.equal(calls[0].path,'/v1/calendar');assert.equal(calls[0].options.base,'apiX');assert.equal(result.items.length,1);assert.equal(result.slots.length,2);assert.equal(result.items[0].patient_birth_date,'1990-01-01');assert.equal(result.items[0].expenses[0].name,'Sessão');assert.ok(!JSON.stringify(result).includes('do-not-cache'));
 assert.notEqual(operationKey('physioRead',{date,scheduleId:'a'.repeat(32)}),operationKey('physioRead',{date,scheduleId:'b'.repeat(32)}));
 hasMore=true;await assert.rejects(()=>physioRead(client,{date,scheduleId:'a'.repeat(32)}),{code:'PHYSIO_CALENDAR_INCOMPLETE'});
});
test('attendance access uses the whole current session with inclusive start and exclusive end',()=>{
 const sessions=groupSessions([snapshot(['13:00','13:01','13:02','13:03','13:04','13:05','13:45','13:46','14:45','14:46'],[appointment('last-minute','13:05'),appointment('next','13:46'),appointment('last','14:45')])],date);
 const atInstant=value=>Date.parse(date+'T'+value+'-03:00');
 assert.equal(sessionAccess(sessions[0],date,atInstant('12:59:59.999')),'future');
 assert.equal(sessionAccess(sessions[0],date,atInstant('13:00:00')),'current');
 assert.equal(sessionAccess(sessions[0],date,atInstant('13:44:59.999')),'current');
 assert.equal(sessionAccess(sessions[0],date,atInstant('13:45:00')),'past');
 assert.equal(sessionAccess(sessions[1],date,atInstant('13:45:00')),'current');
 assert.equal(sessionAccess(sessions[1],date,atInstant('14:44:59.999')),'current');
 assert.equal(sessionAccess(sessions[2],date,atInstant('15:45:00')),'past');
 assert.equal(sessionAccess(sessions[0],'2026-11-10',atInstant('13:15:00')),'past');
 assert.equal(sessionAccess(sessions[0],'2026-11-12',atInstant('13:15:00')),'future');
});

test('16:33 fit-in belongs to the 16:15 block and does not close attendance at 16:40',()=>{
 const times=['16:15','16:16','16:17','16:18','16:19','16:20','16:33','17:00','17:01'];
 const rows=times.map((time,index)=>appointment(String(index),time));
 const sessions=groupSessions([snapshot(times,rows)],date);
 assert.deepEqual(sessions.map(s=>[s.start_time,s.end_time]),[['16:15','17:00'],['17:00','17:45']]);
 assert.equal(sessions[0].items.length,7);assert.equal(sessions[0].items.at(-1).id,'6');
 assert.equal(sessionAccess(sessions[0],date,Date.parse(at('16:40'))),'current');
 assert.equal(sessionAccess(sessions[1],date,Date.parse(at('16:40'))),'future');
 assert.equal(sessionAccess(sessions[0],date,Date.parse(at('17:00'))),'past');
 assert.equal(sessionAccess(sessions[1],date,Date.parse(at('17:00'))),'current');
});

test('isolated appointments never change the final estimate from consecutive blocks',()=>{
 for(const [previous,expected,source] of [[['15:30','15:31'],'17:00','previous_interval'],[['15:15','15:16'],'17:15','previous_interval'],[[],'17:00','default_45']]){
  const slots=[...previous,'16:15','16:16','16:17','16:18','16:19','16:20'];
  const original=[appointment('base','16:15')];
  const baseline=groupSessions([snapshot(slots,original)],date)[0];
  const fits=[appointment('fit','16:33'),appointment('fit2','16:49')];
  const result=groupSessions([snapshot([...slots,'16:33','16:49'],[...original,...fits])],date);
  assert.equal(result.length,1);assert.equal(result[0].end_time,expected);assert.equal(result[0].end_source,source);
  assert.equal(result[0].end_minute,baseline.end_minute);assert.equal(result[0].start_minute,baseline.start_minute);
  assert.deepEqual(result[0].items.map(p=>p.id),['base','fit','fit2']);
  assert.equal(sessionAccess(result[0],date,Date.parse(at('16:40'))),'current');
 }
});

test('sparse schedules and out-of-window appointments remain visible without stretching earlier sessions',()=>{
 const sparse=groupSessions([snapshot([],['09:00','09:18','10:00'].map(time=>appointment(time,time)))],date);
 assert.deepEqual(sparse.map(s=>[s.start_time,s.end_time]),[['09:00','09:45'],['10:00','10:45']]);
 assert.deepEqual(sparse[0].items.map(p=>p.id),['09:00','09:18']);
 const result=groupSessions([snapshot(['16:15','16:16'],[appointment('base','16:15'),appointment('later','17:05')])],date);
 assert.deepEqual(result.map(s=>[s.start_time,s.end_time]),[['16:15','17:00'],['17:05','17:50']]);
 assert.equal(sessionAccess(result[0],date,Date.parse(at('17:03'))),'past');
 assert.equal(sessionAccess(result[1],date,Date.parse(at('17:03'))),'future');
});

test('fit-ins do not mix agendas or move midnight boundaries',()=>{
 const a=snapshot(['23:30','23:31'],[appointment('night','23:31'),appointment('fit','23:53')]);
 const b=snapshot(['23:45','23:46'],[appointment('other','23:46')],'agenda-b');
 const sessions=groupSessions([a,b],date);
 assert.deepEqual(sessions.map(s=>[s.start_time,s.end_time]),[['23:30','00:15'],['23:45','00:30']]);
 assert.equal(sessions[0].items.length,2);assert.equal(sessions[1].items.length,1);
 assert.equal(sessionAccess(sessions[0],date,Date.parse('2026-11-12T00:05:00-03:00')),'current');
 assert.equal(sessionAccess(sessions[0],date,Date.parse('2026-11-12T00:15:00-03:00')),'past');
});
test('attendance window respects Sao Paulo dates, midnight and unavailable boundaries',()=>{
 const session=groupSessions([snapshot([], [appointment('night','23:45')])],date)[0];
 assert.equal(sessionAccess(session,date,Date.parse('2026-11-12T03:15:00Z')),'current');
 assert.equal(sessionAccess(session,date,Date.parse('2026-11-12T03:30:00Z')),'past');
 for(const invalid of [null,{}, {start_minute:780,end_minute:780},{start_minute:780,end_minute:779},{start_minute:-1,end_minute:60},{start_minute:780,end_minute:2300}])assert.equal(sessionAccess(invalid,date,Date.now()),'unavailable');
 assert.equal(sessionAccess(session,'invalid',Date.now()),'unavailable');assert.equal(sessionAccess(session,date,NaN),'unavailable');
});
