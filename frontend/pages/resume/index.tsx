import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useResumes } from 'context/ResumesContext';
import { toast } from 'sonner';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

export default function ResumePage() {
  const { resumes, isLoading, error, fetchResumes, uploadResume, deleteResume, downloadResume } =
    useResumes();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Only PDF or Word documents are accepted.');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
    if (file && !title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast.error('Please select a file.'); return; }
    setUploading(true);
    try {
      await uploadResume(selectedFile, title);
      toast.success('Resume uploaded.');
      setSelectedFile(null);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      toast.error(error ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this resume?')) return;
    try {
      await deleteResume(id);
      toast.success('Resume deleted.');
    } catch {
      toast.error(error ?? 'Delete failed.');
    }
  };

  const handleDownload = async (id: number, filename: string) => {
    try {
      await downloadResume(id, filename);
    } catch {
      toast.error(error ?? 'Download failed.');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-6">

        {/* Header */}
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Resumes</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Upload and manage your resumes. PDF and Word documents are supported.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => router.push('/resume/generate')}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
              type="button"
            >
              Generate from Scratch
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              type="button"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Upload form */}
        <div className="mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Upload a Resume</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium" htmlFor="resume-title">
                Title
              </label>
              <input
                id="resume-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Software Engineer Resume 2026"
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 font-medium" htmlFor="resume-file">
                File (PDF or Word)
              </label>
              <input
                id="resume-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 dark:file:bg-blue-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>

        {/* Resume list */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-6 py-4">
            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'}
            </span>
          </div>

          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">Loading...</div>
          ) : resumes.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              No resumes yet. Upload one above.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {resumes.map((resume) => (
                <li
                  key={resume.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <div
                    className="flex flex-col gap-0.5 cursor-pointer flex-1 min-w-0 pr-4"
                    onClick={() => router.push(`/resume/view/${resume.id}`)}
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{resume.title}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(resume.uploaded_at)}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDownload(resume.id, resume.title)}
                      className="rounded-md border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      type="button"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(resume.id)}
                      className="rounded-md border border-red-100 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-800 transition"
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
