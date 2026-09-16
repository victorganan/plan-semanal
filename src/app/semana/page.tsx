import { redirect } from 'next/navigation';
import { currentIsoWeek } from '@/lib/week';

export default function SemanaIndexPage() {
  redirect(`/semana/${currentIsoWeek()}`);
}
