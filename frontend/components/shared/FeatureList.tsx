export default function FeatureList() {
  const features = [
    { emoji: '✅', text: 'Organize tasks by priority' },
    { emoji: '🗂️', text: 'Group work by project and category' },
    { emoji: '🔄', text: 'Carry over unfinished tasks automatically' },
    { emoji: '📆', text: 'Visualize your week and track progress' },
  ];

  return (
    <section className="py-12 px-6 bg-white dark:bg-gray-800 text-center">
      <div className="grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
        {features.map(({ emoji, text }, idx) => (
          <div key={idx} className="text-lg text-gray-700 dark:text-gray-300 flex items-center justify-center space-x-2">
            <span className="text-2xl">{emoji}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
