export default function Footer() {
  return (
    <footer className="text-center text-sm text-gray-500 dark:text-gray-400 py-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <p>
        © 2025 Work Smarter ·{' '}
        <a href="#" className="hover:underline">Privacy</a> ·{' '}
        <a href="#" className="hover:underline">Terms</a> ·{' '}
        <a
          href="https://github.com/alton-michaux/work-smarter"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          GitHub
        </a>
      </p>
    </footer>
  );
}
