import Link from "next/link";
import { useAuth } from "../context/AuthContext";

const principles = [
  {
    name: "Tasks",
    tagline: "Sharp, actionable, binary",
    description:
      "A task is either done or it isn't. Give it a priority, a deadline and a project, break it into subtasks, and unfinished work carries over until you finish it.",
  },
  {
    name: "Meetings",
    tagline: "Scheduled, time-anchored",
    description:
      "Meetings live at a time, not on a to-do list. They sort by start time, can recur, and mark themselves done once they're over.",
  },
  {
    name: "Notes",
    tagline: "Ambient, persistent, low-contrast",
    description:
      "Notes stay in the background until you need them. Write them in Markdown and lock sensitive ones behind a passphrase.",
  },
];

const features = [
  {
    title: "Daily log",
    description:
      "Today's tasks, meetings and carried-over work on one page, with collapsible parent tasks and drag-to-reorder subtasks.",
  },
  {
    title: "Weekly tracker",
    description:
      "Your week laid out as meetings, tasks and notes, with a running count of what's done and what's left.",
  },
  {
    title: "Timeline",
    description:
      "See which tasks you worked on over time, and how long each one ran.",
  },
  {
    title: "Projects",
    description:
      "Group work by project, with a color, role, description and status for each one.",
  },
  {
    title: "Google Calendar sync",
    description:
      "Import meetings from your calendar, recurring ones included, push your own meetings back, and block the events you don't want imported.",
  },
  {
    title: "Resumes",
    description:
      "Upload a resume or build one from your work log, then get AI feedback on it or have it drafted for you.",
  },
  {
    title: "Search",
    description:
      "Find any task, meeting or note by searching for it.",
  },
  {
    title: "API access",
    description:
      "Create API keys in Settings to read and write your tasks from scripts and other tools.",
  },
];

const About = () => {
  const { loggedIn } = useAuth();

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <main className="mx-auto max-w-4xl px-6 py-10 w-full">
        {/* Intro */}
        <section className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100">
            About Work Smarter
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Work Smarter is a work log for people who want to see what they did,
            what&apos;s next, and what&apos;s still waiting. Track your work day
            by day, review it week by week, and turn it into a resume when you
            need one.
          </p>
        </section>

        {/* Design principles */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Three kinds of entries
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Everything you log is a task, a meeting or a note, and each one
            behaves differently.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {principles.map(({ name, tagline, description }) => (
              <div
                key={name}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{name}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  {tagline}
                </p>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            What you can do
          </h2>
          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            {features.map(({ title, description }) => (
              <div key={title} className="border-l-2 border-blue-600 dark:border-blue-400 pl-4">
                <dt className="font-medium text-gray-900 dark:text-gray-100">{title}</dt>
                <dd className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Privacy */}
        <section className="mt-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your data</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Work Smarter has no ads and doesn&apos;t sell your data. Encrypted
            notes can only be read with your passphrase. A resume is sent to an
            AI service only when you ask for an analysis or a draft.
          </p>
        </section>

        {/* Call to action */}
        <section className="mt-12 flex flex-wrap justify-center gap-4">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white shadow hover:bg-green-700 transition"
              >
                Request Access
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-6 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
              >
                Log In
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default About;
