interface DateToggleUIProps {
  selectedDate: any;
  setSelectedDate: any;
  last7Days: any;
}

export const DateToggleUI = ({ selectedDate, setSelectedDate, last7Days }: DateToggleUIProps) => {
  return (
    <>
      {selectedDate && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                Showing: <span className="font-medium text-gray-800">{selectedDate}</span>
              </div>

              {/* optional date input for jumping */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto">
              {last7Days.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setSelectedDate(d.key)}
                  className={`px-3 py-2 rounded border text-sm whitespace-nowrap ${
                    d.key === selectedDate ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'
                  }`}
                  title={d.key}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
    </>
  )
}