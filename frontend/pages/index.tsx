import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import withAuth from "../lib/withAuth";
import Hero from "../components/shared/Hero";
import ActionItems from "components/shared/ActionItems";
import FeatureList from "../components/shared/FeatureList";
import PrivacyBlurb from "../components/shared/PrivacyBlurb";

const Home = () => {
  const { loggedIn } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {loggedIn ? (
        <main className="mx-auto max-w-4xl px-6 py-16">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            {/* Header */}
            <div className="border-b border-gray-100 dark:border-gray-700 px-8 py-6">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                You’re signed in. Choose your next step.
              </p>
            </div>

            {/* Actions */}
            <div className="px-8 py-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  Go to Dashboard
                </button>

                <button
                  onClick={() => router.push("/tasks")}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                >
                  Open Tasks
                </button>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => router.push("/logout")}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline transition"
                >
                  Log out
                </button>
              </div>
            </div>

            {/* Bottom hint */}
            <div className="border-t border-gray-100 dark:border-gray-700 px-8 py-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Go to the dashboard for an overview of your work or dive straight in and go to your daily task log.
              </p>
            </div>
          </div>
        </main>
      ) : (
        <>
          <Hero />
          <ActionItems />
          <FeatureList />
          <PrivacyBlurb />
        </>
      )}
    </div>
  );
};

export default withAuth(Home);

