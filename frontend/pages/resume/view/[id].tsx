import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useResumes } from 'context/ResumesContext';
import { useAPI } from 'context/APIContext';
import { Resume } from 'types/types';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const isPdf = (url: string) => url.toLowerCase().split('?')[0].endsWith('.pdf');

export default function ResumeViewPage() {
  const router = useRouter();
  const { id } = router.query;
  const { resumes, fetchResumes, deleteResume, downloadResume, isLoading, error } = useResumes();
  const { getAuthHeaders } = useAPI();
  const [resume, setResume] = useState<Resume | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (resumes.length === 0) fetchResumes();
  }, []);

  useEffect(() => {
    if (id && resumes.length > 0) {
      const found = resumes.find((r) => r.id === Number(id));
      setResume(found ?? null);
    }
  }, [id, resumes]);

  // Fetch PDF as blob via the authenticated download endpoint
  useEffect(() => {
    if (!resume || !isPdf(resume.file)) return;

    let objectUrl: string;
    setPreviewLoading(true);

    fetch(`${API_URL}/resumes/${resume.id}/download/`, { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load preview (${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => setBlobUrl(null))
      .finally(() => setPreviewLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resume?.id]);

  const handleDelete = async () => {
    if (!resume || !confirm('Delete this resume?')) return;
    try {
      await deleteResume(resume.id);
      toast.success('Resume deleted.');
      router.push('/resume');
    } catch {
      toast.error(error ?? 'Delete failed.');
    }
  };

  const handleDownload = async () => {
    if (!resume) return;
    try {
      await downloadResume(resume.id, resume.title);
    } catch {
      toast.error(error ?? 'Download failed.');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">Resume not found.</p>
      </div>
    );
  }

  const canPreview = isPdf(resume.file);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12">
      <div className="max-w-5xl mx-auto px-6">

        <button
          onClick={() => router.push('/resume')}
          className="mb-6 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          type="button"
        >
          &larr; All Resumes
        </button>

        {/* Header */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{resume.title}</h1>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Uploaded {formatDate(resume.uploaded_at)}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleDownload}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                type="button"
              >
                Download
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-800 transition"
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        {canPreview ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            {previewLoading ? (
              <div className="flex items-center justify-center" style={{ height: '80vh' }}>
                <p className="text-sm text-gray-400 dark:text-gray-500">Loading preview...</p>
              </div>
            ) : blobUrl ? (
              <iframe
                src={blobUrl}
                className="w-full"
                style={{ height: '80vh' }}
                title={resume.title}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 p-10 text-center" style={{ height: '80vh' }}>
                <p className="text-sm text-gray-500 dark:text-gray-400">Preview could not be loaded.</p>
                <button
                  onClick={handleDownload}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                  type="button"
                >
                  Download to view
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Preview is not available for Word documents.</p>
            <button
              onClick={handleDownload}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              type="button"
            >
              Download to view
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
