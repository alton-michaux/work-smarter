type Props = {
  selectedWeek: string;
  onWeekChange: (newWeek: string) => void;
};

export default function WeekSelector({ selectedWeek, onWeekChange }: Props) {
  const changeWeek = (offset: number) => {
    const current = new Date(selectedWeek);
    current.setDate(current.getDate() + offset * 7);
    onWeekChange(current.toISOString().split('T')[0]);
  };

  return (
    <div className="flex items-center gap-4 mb-4">
      <button onClick={() => changeWeek(-1)}>← Previous Week</button>
      <div>Week of {selectedWeek}</div>
      <button onClick={() => changeWeek(1)}>Next Week →</button>
    </div>
  );
}
