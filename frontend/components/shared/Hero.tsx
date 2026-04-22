import Link from 'next/link';

export default function Hero() {
  return (
    <section className="text-center py-20 px-6 bg-gray-50 dark:bg-gray-900">
      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
        Welcome to Work Smarter!
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        Your productivity, organized. Your priorities, clear.
      </p>
    </section>
  );
}
