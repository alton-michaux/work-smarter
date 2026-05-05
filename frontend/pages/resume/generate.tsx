import { useRouter } from 'next/router';
import { useState } from 'react';
import { useResumes } from 'context/ResumesContext';
import { useAuth } from 'context/AuthContext';
import { ResumeGenerationState } from 'types/types';
import { toast } from 'sonner';
import ResumeGenerationPanel from 'components/resume/ResumeGenerationPanel';

export default function GenerateResumePage() {
  const router = useRouter();
  const { generateNewResume, downloadNewGeneratedResume, error } = useResumes();
  const { user } = useAuth();
  const [generation, setGeneration] = useState<ResumeGenerationState>({ status: 'idle' });
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  const handleGenerate = async (forceRefresh = false) => {
    setGeneration({ status: 'loading' });
    try {
      const data = await generateNewResume(forceRefresh, { phone, location });
      setGeneration({ status: 'success', data });
    } catch (e: any) {
      const msg = e.message ?? 'Generation failed.';
      setGeneration({ status: 'error', message: msg });
      toast.error(msg);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadNewGeneratedResume();
    } catch {
      toast.error(error ?? 'Download failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-6">

        <button
          onClick={() => router.push('/resume')}
          className="mb-6 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          type="button"
        >
          &larr; All Resumes
        </button>

        <div className="mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Generate Resume from Work History
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            AI will build a professional resume from your completed tasks and projects. No existing resume needed.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={user?.username ?? ''}
                disabled
                className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input
                type="text"
                value={user?.email ?? ''}
                disabled
                className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. (555) 867-5309"
                className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {generation.status !== 'loading' && (
            <button
              onClick={() => handleGenerate(generation.status === 'success')}
              className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition"
              type="button"
            >
              {generation.status === 'success' ? 'Regenerate with These Details' : 'Generate Resume'}
            </button>
          )}
        </div>

        {generation.status === 'loading' && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              AI is building your resume from your work history… (15–45s)
            </p>
          </div>
        )}

        {generation.status === 'success' && (
          <ResumeGenerationPanel
            data={generation.data}
            onRegenerate={() => handleGenerate(true)}
            onDownload={handleDownload}
            isRegenerating={false}
          />
        )}

        {generation.status === 'error' && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
            {generation.message}
          </div>
        )}

      </div>
    </div>
  );
}
