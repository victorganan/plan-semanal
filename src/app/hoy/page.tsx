import { redirect } from 'next/navigation';
import { currentIsoWeek, todayDayOfWeek } from '@/lib/week';

export default function HoyPage() {
  redirect(`/dia/${currentIsoWeek()}/${todayDayOfWeek()}`);
}
