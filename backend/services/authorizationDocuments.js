function list(db, processId) {
  return db('guide_authorization_documents as d')
    .leftJoin('users as u','u.id','d.uploaded_by').leftJoin('people as pe','pe.id','u.person_id')
    .where('d.guide_process_id',processId).select('d.*','pe.full_name as uploaded_by_name').orderBy('d.id','desc');
}
module.exports = {list};
