interface TaskLayoutProps {
  sections: any;
  OutlineTree: any;
}

export const TaskLayout = ({sections, OutlineTree}: TaskLayoutProps) => {
  return(
    <>
      <div className="space-y-8">
        <div>
          <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">MEETINGS</h2>
          <div className="rounded border">
            {sections.meetings.length ? <OutlineTree nodes={sections.meetings} /> : (
              <div className="px-4 py-3 text-sm text-gray-500">No meetings.</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">TASKS</h2>
          <div className="rounded border">
            {sections.tasks.length ? <OutlineTree nodes={sections.tasks} /> : (
              <div className="px-4 py-3 text-sm text-gray-500">No tasks.</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold tracking-widest text-gray-500 mb-2">NOTES</h2>
          <div className="rounded border">
            {sections.notes.length ? <OutlineTree nodes={sections.notes} /> : (
              <div className="px-4 py-3 text-sm text-gray-500">No notes.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}