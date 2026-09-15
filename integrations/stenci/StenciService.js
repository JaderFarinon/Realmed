class StenciService {
  constructor(client) { this.client = client }
  searchPatients(filters) { return this.client.request('patients.search', { query: filters }) }
  getPatient(id) { return this.client.request('patients.get', { query: { id } }) }
  getAssessments(filters) { return this.client.request('assessments.list', { query: filters }) }
  getAppointments(filters) { return this.client.request('appointments.list', { query: filters }) }
  getTreatments(filters) { return this.client.request('treatments.list', { query: filters }) }
  getTreatmentSessions(id) { return this.client.request('treatments.sessions', { query: { id } }) }
  testConnection() { return this.client.request('connection.test') }
}

module.exports = StenciService
