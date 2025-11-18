import { getUserProfile } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import {
  getTimeReport,
  getTimeReportSummary,
  getTimeTrackingUsers,
} from '@/lib/reports/time-report';
import TimeReportClient from './TimeReportClient';

export default async function TimeReportPage() {
  const user = await getUserProfile();

  if (!user || !user.company_id) {
    redirect('/login');
  }

  const [logs, summary, users] = await Promise.all([
    getTimeReport(user.company_id),
    getTimeReportSummary(user.company_id),
    getTimeTrackingUsers(user.company_id),
  ]);

  return (
    <div>
      <TimeReportClient logs={logs} summary={summary} users={users} />
    </div>
  );
}
