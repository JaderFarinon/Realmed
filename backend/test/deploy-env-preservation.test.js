const test=require('node:test'),assert=require('node:assert/strict'),dotenv=require('dotenv');
const {enablePermissionsText}=require('../../deploy/enable-permissions.cjs');
test('publication changes only the permission flag, preserving exact quoted secret values',()=>{
 const secrets="# Keep comments\nSTENCI_FISIO_PASSWORD='example(\"with)quotes#&/$'\nOTHER='back\\slash'\n";
 for(const flag of ['','PERMISSIONS_ENABLED=false\n','export PERMISSIONS_ENABLED = "false" # comment\r\n']){
  const original=secrets+flag,updated=enablePermissionsText(original),before=dotenv.parse(original),after=dotenv.parse(updated);
  assert.equal(after.PERMISSIONS_ENABLED,'true');assert.equal(after.STENCI_FISIO_PASSWORD,before.STENCI_FISIO_PASSWORD);assert.equal(after.OTHER,before.OTHER);
  assert.ok(updated.startsWith(secrets));assert.equal(enablePermissionsText(updated),updated);
 }
});
