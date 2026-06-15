import { UserCheck, AlertTriangle, Clock } from 'lucide-react';
import type { RecognitionEvent } from '../../pages/AdminDashboard';

interface Props {
  events: RecognitionEvent[];
  compact?: boolean;
}

export default function EventFeed({ events, compact }: Props) {
  const displayEvents = compact ? events.slice(0, 15) : events;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl ${compact ? '' : ''}`}>
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Recognition Events</h3>
        <span className="text-[10px] text-slate-500">{events.length} total</span>
      </div>

      <div className={`${compact ? 'max-h-[500px]' : 'max-h-[700px]'} overflow-y-auto`}>
        {displayEvents.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No events yet</p>
            <p className="text-xs text-slate-600 mt-1">Start the camera to detect faces</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {displayEvents.map((event) => (
              <div key={event.id} className="px-4 py-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    event.is_unknown
                      ? 'bg-red-500/10 border border-red-500/20'
                      : 'bg-emerald-500/10 border border-emerald-500/20'
                  }`}>
                    {event.is_unknown ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {event.is_unknown ? 'Unknown Face Detected' : event.matched_username}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(event.detected_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    {event.is_unknown ? (
                      <span className="text-[10px] font-medium text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">ALERT</span>
                    ) : (
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">OK</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
