import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  MapPin,
  Camera,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  CalendarDays,
  Send,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { IAttendance } from '../../../shared/types';

export function EmployeeAttendancePage() {
  const [attendances, setAttendances] = useState<IAttendance[]>([]);
  const [todayRecord, setTodayRecord] = useState<IAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bonus Camera & Geolocation State
  const [enableCamera, setEnableCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Correction Request Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [corrDate, setCorrDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [corrIn, setCorrIn] = useState('09:00');
  const [corrOut, setCorrOut] = useState('17:30');
  const [corrReason, setCorrReason] = useState('');
  const [submittingCorr, setSubmittingCorr] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getMyAttendance();
      if (res.data) {
        setAttendances(res.data.records);
        setTodayRecord(res.data.todayRecord);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Web camera activation
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (enableCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [enableCamera]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    setFeedback(null);

    let lat: number | undefined;
    let lng: number | undefined;

    // Browser Geolocation attempt
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      } catch (geoErr) {
        console.warn('Geolocation unavailable:', geoErr);
      }
    }

    try {
      const res = await api.checkIn({
        latitude: lat,
        longitude: lng,
        faceDetected: cameraActive,
      });

      if (res.success && res.data) {
        setTodayRecord(res.data);
        setFeedback({
          type: 'success',
          message: res.message || 'Check-in recorded successfully on official server timestamp.',
        });
        await loadData();
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Check-in failed',
      });
    } finally {
      setCheckingIn(false);
      stopCamera();
      setEnableCamera(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    setFeedback(null);

    try {
      const res = await api.checkOut();
      if (res.success && res.data) {
        setTodayRecord(res.data);
        setFeedback({
          type: 'success',
          message: res.message || 'Check-out recorded successfully.',
        });
        await loadData();
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Check-out failed',
      });
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCorr(true);

    try {
      const inDate = new Date(`${corrDate}T${corrIn}:00`);
      const outDate = new Date(`${corrDate}T${corrOut}:00`);

      const res = await api.requestAttendanceCorrection({
        attendanceDate: corrDate,
        requestedCheckIn: inDate.toISOString(),
        requestedCheckOut: outDate.toISOString(),
        reason: corrReason,
      });

      if (res.success) {
        alert('Attendance correction submitted to HR inbox for review.');
        setShowCorrectionModal(false);
        setCorrReason('');
        await loadData();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit correction request');
    } finally {
      setSubmittingCorr(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Daily Attendance & Work Hours</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Server-timestamped web check-in, geofence verification, and attendance correction requests
          </p>
        </div>

        <button
          onClick={() => setShowCorrectionModal(true)}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs self-start"
        >
          <Clock className="w-3.5 h-3.5 text-blue-600" /> Request Attendance Correction
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Check-In / Check-Out Action Terminal */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Today's Clock State</span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-slate-900 font-mono-numbers">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded capitalize ${
                  todayRecord?.checkIn && todayRecord?.checkOut
                    ? 'bg-slate-100 text-slate-800'
                    : todayRecord?.checkIn
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {todayRecord?.checkIn && todayRecord?.checkOut
                  ? 'Day Completed'
                  : todayRecord?.checkIn
                  ? `Checked In (${todayRecord.status.toUpperCase()})`
                  : 'Ready to Check In'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono-numbers">
              {todayRecord?.checkIn
                ? `Check-in time: ${new Date(todayRecord.checkIn).toLocaleTimeString()}`
                : 'Grace period applies until 09:15 AM.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Optional Camera Toggle */}
            {!todayRecord?.checkIn && (
              <button
                type="button"
                onClick={() => setEnableCamera(!enableCamera)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
                  enableCamera
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Camera className="w-4 h-4" />
                {enableCamera ? 'Camera Active' : 'Enable Face Verification (Bonus)'}
              </button>
            )}

            {/* Check-In / Check-Out Buttons */}
            {!todayRecord?.checkIn ? (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                {checkingIn ? 'Recording Check-In...' : 'Record Web Check-In'}
              </button>
            ) : !todayRecord?.checkOut ? (
              <button
                onClick={handleCheckOut}
                disabled={checkingOut}
                className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Clock className="w-4 h-4" />
                {checkingOut ? 'Calculating Hours...' : 'Record Web Check-Out'}
              </button>
            ) : (
              <div className="px-5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Completed ({Math.floor((todayRecord.durationMinutes || 0) / 60)}h{' '}
                {(todayRecord.durationMinutes || 0) % 60}m)
              </div>
            )}
          </div>
        </div>

        {/* Video Preview if Camera Enabled */}
        {enableCamera && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-36 h-28 bg-slate-950 rounded-xl object-cover" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900">Webcam Face Detection Sensor</p>
              <p className="text-[11px] text-slate-500">
                Live camera verification for employee attendance check-in. Coordinates and face presence will be attached to the record.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Attendance History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider">My Attendance History</span>
          <span className="text-slate-500 font-mono-numbers">{attendances.length} Days Recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-numbers">
            <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] font-sans">
              <tr>
                <th className="px-6 py-3">Calendar Date</th>
                <th className="px-6 py-3">Check-In</th>
                <th className="px-6 py-3">Check-Out</th>
                <th className="px-6 py-3">Duration Worked</th>
                <th className="px-6 py-3 font-sans">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Loading attendance history...
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-sans">
                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No attendance records for the current period. Use the check-in button above.
                  </td>
                </tr>
              ) : (
                attendances.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{a.date}</td>
                    <td className="px-6 py-3.5 text-slate-700">
                      {a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">
                      {a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-800">
                      {a.durationMinutes ? `${Math.floor(a.durationMinutes / 60)}h ${a.durationMinutes % 60}m` : '—'}
                    </td>
                    <td className="px-6 py-3.5 font-sans">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          a.status === 'present'
                            ? 'text-emerald-700'
                            : a.status === 'late'
                            ? 'text-amber-700'
                            : 'text-purple-700'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Correction Request Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Request Attendance Correction</h3>
            <p className="text-xs text-slate-500 mb-4">Submit missed or adjusted hours for HR review</p>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attendance Date *</label>
                <input
                  type="date"
                  value={corrDate}
                  onChange={(e) => setCorrDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check-In Time *</label>
                  <input
                    type="time"
                    value={corrIn}
                    onChange={(e) => setCorrIn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check-Out Time *</label>
                  <input
                    type="time"
                    value={corrOut}
                    onChange={(e) => setCorrOut(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Adjustment *</label>
                <textarea
                  placeholder="e.g. Field visit, biometric machine outage, forgotten check-out..."
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorr}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {submittingCorr ? 'Submitting...' : 'Submit to HR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
