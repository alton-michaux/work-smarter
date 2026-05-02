import { useRouter } from 'next/router';
import { useState } from 'react';
import { useResumes } from 'context/ResumesContext';
import { ResumeGenerationState } from 'types/types';
import { toast } from 'sonner';
import ResumeGenerationPanel from 'components/resume/ResumeGenerationPanel';

export default function GenerateResumePage() {
  const router = useRouter();
  const { generateNewResume, downloadNewGeneratedResume, error } = useResumes();
  const [generation, setGeneration] = useState<ResumeGenerationState>({ status: 'idle' });

  const handleGenerate = async (forceRefresh = false) => {
    setGeneration({ status: 'loading' });
    try {
      const data = await generateNewResume(forceRefresh);
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

          {generation.status === 'idle' || generation.status === 'error' ? (
            <button
              onClick={() => handleGenerate(false)}
              className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition"
              type="button"
            >
              Generate Resume
            </button>
          ) : null}
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
            isRegenerating={generation.status === 'loading'}
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
