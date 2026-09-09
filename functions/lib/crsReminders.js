import { overdueChurches } from '../../public/crs-reminders.js';

export function reminderRecipients(accounts) {
  return [...new Set(accounts.filter(a => a.status === 'approved').map(a => String(a.email || '').trim().toLowerCase())
    .filter(email => /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)))];
}

export async function reminderKey(church, email) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${church.id}:${church.activityAt}:${email}`));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export function reminderMessage(church, email, from = 'crs@wolko.org') {
  return {
    from: `WOLKO CRS <${from}>`, to: [email], reply_to: 'wolkorea1@gmail.com',
    subject: '[WOLKO CRS] 6개월 미교류 교회 컨택 리마인드',
    text: `${church.churchName || '이름 없는 교회'}의 교류 기록이 6개월간 업데이트되지 않았습니다. 해당 교회 컨택 리마인드 드립니다.\n\n마지막 수정 또는 방문 기록 이후 ${church.inactiveDays}일이 경과했습니다.\n담당자께서는 교류 현황을 확인하시고, 연락 또는 방문 후 CRS에 기록을 남겨 주세요.\n\nCRS 바로가기: https://wolko.org/crs/\n\n본 알림은 실제 교류 여부가 아닌 CRS 기록을 기준으로 발송됩니다.`,
  };
}

// Claim before sending. Unknown delivery outcomes stay claimed for manual review;
// automatically retrying after the provider accepted a message could duplicate mail.
export async function deliverReminder({ church, email, ledger, send, from, now = Date.now() }) {
  const key = await reminderKey(church, email);
  if (!await ledger.claim(key, { status: 'sending', claimedAt: now })) return 'skipped';
  try {
    const id = await send(reminderMessage(church, email, from), key);
    await ledger.finish(key, { status: 'sent', sentAt: now, messageId: id });
    return 'sent';
  } catch (error) {
    // No automatic retries, including explicit rejection: surface failures to operators.
    await ledger.finish(key, { status: 'review', failedAt: now }).catch(() => {});
    throw error;
  }
}

export { overdueChurches };
