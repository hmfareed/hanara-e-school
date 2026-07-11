import api from '../../services/api';

export const mockExamApi = {
  // Series Management
  getSeries: async () => {
    const res = await api.get('/mock-exams/series');
    return res.data;
  },
  createSeries: async (data) => {
    const res = await api.post('/mock-exams/series', data);
    return res.data;
  },
  closeSeries: async (id) => {
    const res = await api.patch(`/mock-exams/series/${id}/close`);
    return res.data;
  },

  // Teacher entries
  getMyEntries: async (seriesId) => {
    const res = await api.get(`/mock-exams/${seriesId}/my-entries`);
    return res.data;
  },
  getEntryScores: async (seriesId, entryId, classId = null, subjectId = null) => {
    const url = `/mock-exams/${seriesId}/entries/${entryId}/scores`;
    const params = classId && subjectId ? { classId, subjectId } : {};
    const res = await api.get(url, { params });
    return res.data;
  },
  saveScores: async (seriesId, entryId, scores) => {
    const res = await api.post(`/mock-exams/${seriesId}/entries/${entryId}/scores`, { scores });
    return res.data;
  },
  submitEntry: async (seriesId, entryId) => {
    const res = await api.patch(`/mock-exams/${seriesId}/entries/${entryId}/submit`);
    return res.data;
  },

  // Admin/HT Reopen
  reopenEntry: async (seriesId, entryId, reason) => {
    const res = await api.patch(`/mock-exams/${seriesId}/entries/${entryId}/reopen`, { reason });
    return res.data;
  },

  // Admin Panels
  getSubmissionMatrix: async (seriesId) => {
    const res = await api.get(`/mock-exams/${seriesId}/matrix`);
    return res.data;
  },
  getStudentResult: async (seriesId, studentId) => {
    const res = await api.get(`/mock-exams/${seriesId}/students/${studentId}`);
    return res.data;
  },
  getRankings: async (seriesId, classId = '') => {
    const res = await api.get(`/mock-exams/${seriesId}/rankings`, {
      params: classId ? { classId } : {},
    });
    return res.data;
  },
  getClassGradesGrid: async (seriesId, classId) => {
    const res = await api.get(`/mock-exams/${seriesId}/classes/${classId}/grades-grid`);
    return res.data;
  },
  getStudentTrend: async (seriesId, studentId) => {
    const res = await api.get(`/mock-exams/${seriesId}/trend/${studentId}`);
    return res.data;
  },

  // PDF Download helpers using axios arraybuffer to avoid auth token in query param
  downloadSingleSlip: async (seriesId, studentId) => {
    const res = await api.post(`/mock-exams/${seriesId}/students/${studentId}/slip`, {}, { responseType: 'blob' });
    return res.data;
  },
  downloadClassSlips: async (seriesId, classId) => {
    const res = await api.post(`/mock-exams/${seriesId}/classes/${classId}/slips`, {}, { responseType: 'blob' });
    return res.data;
  },
};
