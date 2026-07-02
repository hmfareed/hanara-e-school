import React, { useState } from 'react';
import { X, Upload, Download, AlertTriangle, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import api from '../../services/api';

const BulkImportModal = ({ onClose, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Template headers
  const HEADERS = [
    'First Name',
    'Last Name',
    'Other Names',
    'Gender',
    'Date of Birth',
    'Class Name',
    'Medical Notes',
    'Guardian First Name',
    'Guardian Last Name',
    'Guardian Relationship',
    'Guardian Phone',
    'Guardian Alt Phone',
    'Guardian Email',
    'Guardian Occupation',
    'Guardian Address'
  ];

  // Helper: Download sample CSV
  const handleDownloadTemplate = () => {
    const csvContent = [
      HEADERS.join(','),
      'John,Doe,Kofi,male,2015-05-15,Primary 1A,Allergic to peanuts,Robert,Doe,father,0241234567,,robert.doe@example.com,Engineer,123 Tamale St',
      'Mary,Mensah,Ama,female,2016-08-20,Primary 1B,,Elizabeth,Mensah,mother,0277654321,0201112222,,Trader,Tamale Market Square'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'hanara_students_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: RFC 4180 CSV parser
  const parseCSV = (text) => {
    const lines = [];
    let row = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push('');
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  };

  // Validation rules
  const validateRow = (row) => {
    const errors = {};
    
    // Student Validations
    if (!row.firstName || !row.firstName.trim()) {
      errors.firstName = 'First Name is required';
    }
    if (!row.lastName || !row.lastName.trim()) {
      errors.lastName = 'Last Name is required';
    }
    
    const gender = row.gender ? row.gender.trim().toLowerCase() : '';
    if (!gender) {
      errors.gender = 'Gender is required';
    } else if (gender !== 'male' && gender !== 'female') {
      errors.gender = "Gender must be 'male' or 'female'";
    }

    if (!row.dob || !row.dob.trim()) {
      errors.dob = 'Date of Birth is required';
    } else {
      const parsedDate = Date.parse(row.dob.trim());
      if (isNaN(parsedDate)) {
        errors.dob = 'Invalid Date format (use YYYY-MM-DD)';
      }
    }

    if (!row.className || !row.className.trim()) {
      errors.className = 'Class Name is required';
    }

    // Guardian Validations (Only if guardian columns are provided)
    const hasGuardianData = 
      row.guardian?.firstName?.trim() || 
      row.guardian?.lastName?.trim() || 
      row.guardian?.phone?.trim();

    if (hasGuardianData) {
      if (!row.guardian.firstName || !row.guardian.firstName.trim()) {
        errors.guardianFirstName = 'Guardian First Name is required';
      }
      if (!row.guardian.lastName || !row.guardian.lastName.trim()) {
        errors.guardianLastName = 'Guardian Last Name is required';
      }
      
      const rel = row.guardian.relationship ? row.guardian.relationship.trim().toLowerCase() : '';
      const validRelations = ['father', 'mother', 'guardian', 'sibling', 'grandparent', 'uncle', 'aunt', 'other'];
      if (!rel) {
        errors.guardianRelationship = 'Relationship is required';
      } else if (!validRelations.includes(rel)) {
        errors.guardianRelationship = 'Must be father/mother/guardian/sibling/grandparent/uncle/aunt/other';
      }

      const phone = row.guardian.phone ? row.guardian.phone.trim() : '';
      if (!phone) {
        errors.guardianPhone = 'Phone number is required';
      } else if (phone.length < 10) {
        errors.guardianPhone = 'Phone must be at least 10 digits';
      }

      if (row.guardian.email && row.guardian.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.guardian.email.trim())) {
          errors.guardianEmail = 'Invalid Email address';
        }
      }
    } else {
      errors.guardian = 'Guardian details (First Name, Last Name, Phone, Relationship) are required';
    }

    return errors;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please select a valid CSV file');
      return;
    }

    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rawLines = parseCSV(text);
        
        if (rawLines.length <= 1) {
          setError('The CSV file is empty or does not contain data rows');
          return;
        }

        // Header check
        const headers = rawLines[0].map(h => h.trim().toLowerCase());
        const expectedHeaders = HEADERS.map(h => h.trim().toLowerCase());
        
        // Ensure at least core headers are present
        const hasCoreHeaders = ['first name', 'last name', 'gender', 'date of birth', 'class name'].every(h => 
          headers.includes(h)
        );

        if (!hasCoreHeaders) {
          setError('Invalid CSV columns. Please download and use the provided template.');
          return;
        }

        // Map column indices dynamically
        const idxOf = (colName) => headers.indexOf(colName.toLowerCase());

        const dataRows = [];
        for (let i = 1; i < rawLines.length; i++) {
          const cols = rawLines[i];
          // Skip empty lines
          if (cols.length === 0 || (cols.length === 1 && cols[0].trim() === '')) {
            continue;
          }

          const studentObj = {
            firstName: cols[idxOf('First Name')] || '',
            lastName: cols[idxOf('Last Name')] || '',
            otherNames: cols[idxOf('Other Names')] || '',
            gender: cols[idxOf('Gender')] || '',
            dob: cols[idxOf('Date of Birth')] || '',
            className: cols[idxOf('Class Name')] || '',
            medicalNotes: cols[idxOf('Medical Notes')] || '',
            guardian: {
              firstName: cols[idxOf('Guardian First Name')] || '',
              lastName: cols[idxOf('Guardian Last Name')] || '',
              relationship: cols[idxOf('Guardian Relationship')] || '',
              phone: cols[idxOf('Guardian Phone')] || '',
              altPhone: cols[idxOf('Guardian Alt Phone')] || '',
              email: cols[idxOf('Guardian Email')] || '',
              occupation: cols[idxOf('Guardian Occupation')] || '',
              address: cols[idxOf('Guardian Address')] || ''
            }
          };

          const validationErrors = validateRow(studentObj);
          
          dataRows.push({
            rowNumber: i + 1,
            data: studentObj,
            errors: validationErrors,
            isValid: Object.keys(validationErrors).length === 0
          });
        }

        setParsedData(dataRows);
      } catch (err) {
        setError('Error reading or parsing the CSV file');
        console.error(err);
      }
    };

    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleSubmit = async () => {
    const validRows = parsedData.filter(r => r.isValid).map(r => r.data);
    
    if (validRows.length === 0) {
      setError('There are no valid student records to import');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/students/bulk', validRows);
      if (res.data?.success) {
        setSummary(res.data.data);
      } else {
        setError(res.data?.message || 'Bulk import failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error occurred during bulk upload');
    } finally {
      setLoading(false);
    }
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-800" size={22} />
              Bulk Import Students
            </h2>
            <p className="text-xs text-slate-500 mt-1">Upload a CSV list to admit multiple students in a single batch</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold flex items-start gap-2.5">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success summary view */}
          {summary ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-6 max-w-md mx-auto my-4 shadow-sm">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                <CheckCircle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Import Successful!</h3>
                <p className="text-sm text-slate-500 mt-2">
                  The student records have been successfully saved to the database.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase">Students</div>
                  <div className="text-xl font-bold text-emerald-800">{summary.studentsCount}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase">New Guardians</div>
                  <div className="text-xl font-bold text-slate-800">{summary.newGuardiansCount}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase">Linked Siblings</div>
                  <div className="text-xl font-bold text-slate-800">{summary.linkedGuardiansCount}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  onImportSuccess();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
              >
                Return to Directory
              </button>
            </div>
          ) : (
            <>
              {/* File Dropzone */}
              {!file ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Admissions Template</span>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-colors"
                    >
                      <Download size={14} /> Download CSV Template
                    </button>
                  </div>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                      isDragOver
                        ? 'border-emerald-800 bg-emerald-50/50 scale-[0.99]'
                        : 'border-slate-300 hover:border-emerald-700 bg-slate-50/30'
                    }`}
                    onClick={() => document.getElementById('csv-file-input').click()}
                  >
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                      <Upload size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Drag and drop your student CSV file here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      or click to browse from your computer (CSV files only)
                    </p>
                  </div>
                </div>
              ) : (
                /* CSV Preview Table & Controls */
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                  {/* Status header */}
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800 truncate">{file.name}</span>
                      <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setFile(null);
                          setParsedData([]);
                          setError('');
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        Reset / Choose Another File
                      </button>
                    </div>
                  </div>

                  {/* Summary counts */}
                  <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-200 text-center py-4 bg-white">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Total Rows</div>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">{parsedData.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Ready to Import</div>
                      <div className="text-lg font-bold text-emerald-700 mt-0.5 flex items-center justify-center gap-1">
                        <CheckCircle size={16} />
                        {validCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Errors / Attention Required</div>
                      <div className={`text-lg font-bold mt-0.5 flex items-center justify-center gap-1 ${invalidCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        <AlertTriangle size={16} />
                        {invalidCount}
                      </div>
                    </div>
                  </div>

                  {/* Scrollable preview table */}
                  <div className="overflow-x-auto max-h-[350px]">
                    <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-100">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                        <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4 w-12 text-center">Row</th>
                          <th className="py-3 px-4">Student Info</th>
                          <th className="py-3 px-4">Class</th>
                          <th className="py-3 px-4">Guardian Info</th>
                          <th className="py-3 px-4">Status & Validation Messages</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedData.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`transition-colors ${row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/20 hover:bg-red-50/30'}`}
                          >
                            <td className="py-3.5 px-4 text-center font-bold text-slate-400 border-r border-slate-100">
                              {row.rowNumber}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800">
                                {row.data.firstName} {row.data.lastName}
                              </div>
                              {row.data.otherNames && (
                                <div className="text-[10px] text-slate-400">Other: {row.data.otherNames}</div>
                              )}
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {row.data.gender} • {row.data.dob}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {row.data.className}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-700">
                                {row.data.guardian.firstName} {row.data.guardian.lastName}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {row.data.guardian.relationship} • {row.data.guardian.phone}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                  <CheckCircle size={12} /> Ready
                                </span>
                              ) : (
                                <div className="space-y-1 text-[10px] font-medium text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">
                                  {Object.entries(row.errors).map(([key, msg]) => (
                                    <div key={key} className="flex items-start gap-1">
                                      <span className="font-bold shrink-0">•</span>
                                      <span>{msg}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Warning banner about invalid rows */}
                  {invalidCount > 0 && (
                    <div className="p-3 bg-amber-50 border-t border-b border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                      <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                      <span>
                        Note: The import action will <strong>skip</strong> {invalidCount} row(s) containing errors. Only the {validCount} valid row(s) will be submitted.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!summary && (
          <div className="p-5 border-t border-slate-200 bg-white flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="py-2.5 px-4 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            {file && (
              <button
                onClick={handleSubmit}
                disabled={loading || validCount === 0}
                className="py-2.5 px-6 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm rounded-xl transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Admit {validCount} Valid Students</span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImportModal;
