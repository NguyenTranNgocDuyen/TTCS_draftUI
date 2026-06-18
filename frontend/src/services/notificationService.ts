import axios from 'axios';
import type { AppError } from '../types';
import httpClient from '../utils/httpClient';

interface BackendResponse<T> {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  data?: T;
}

interface BackendNotification {
  notificationID?: string;
  id?: string;
  senderID?: string | null;
  receiverID?: string;
  content?: string;
  createdAt?: string | Date;
  isRead?: boolean;
  relatedType?: string | null;
  sender?: {
    userID?: string;
    username?: string;
    email?: string;
    linkAvatar?: string | null;
  } | null;
  targetUrl?: string;
  actionUrl?: string;
  relatedUrl?: string;
  url?: string;
  link?: string;
  path?: string;
}

export interface NotificationItem {
  notificationID: string;
  id: string;
  senderID: string | null;
  receiverID: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  relatedType: string | null;
  sender?: BackendNotification['sender'];
  targetUrl?: string;
}

export async function getMyNotifications(userID: string): Promise<NotificationItem[]> {
  validateId(userID, 'Thiếu mã người dùng.', 'NOTIFICATION_USER_MISSING');

  try {
    const response = await httpClient.get<
      BackendResponse<BackendNotification[]> | BackendNotification[]
    >(`/notification/received/${encodeURIComponent(userID)}`);
    const data = unwrapBackendData<BackendNotification[]>(response.data);

    return normalizeNotifications(data);
  } catch (error) {
    throw normalizeNotificationError(
      error,
      'Không thể tải danh sách thông báo.',
      'NOTIFICATION_LIST_FAILED',
    );
  }
}

export async function getUnreadCount(userID: string): Promise<number> {
  validateId(userID, 'Thiếu mã người dùng.', 'NOTIFICATION_USER_MISSING');

  try {
    const response = await httpClient.get<
      BackendResponse<{ count?: number } | number> | { count?: number } | number
    >(`/notification/unread-count/${encodeURIComponent(userID)}`);
    const data = unwrapBackendData<{ count?: number } | number>(response.data);
    const count = typeof data === 'number' ? data : Number(data?.count || 0);

    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    throw normalizeNotificationError(
      error,
      'Không thể tải số thông báo chưa đọc.',
      'NOTIFICATION_COUNT_FAILED',
    );
  }
}

export async function markAsRead(notificationID: string): Promise<NotificationItem> {
  validateId(notificationID, 'Thiếu mã thông báo.', 'NOTIFICATION_ID_MISSING');

  try {
    const response = await httpClient.patch<
      BackendResponse<BackendNotification> | BackendNotification
    >(`/notification/read/${encodeURIComponent(notificationID)}`);
    const data = unwrapBackendData<BackendNotification>(response.data);

    if (!data) {
      throw createNotificationError(
        'Notification response is empty.',
        'NOTIFICATION_RESPONSE_INVALID',
      );
    }

    return normalizeNotification(data);
  } catch (error) {
    throw normalizeNotificationError(
      error,
      'Không thể đánh dấu thông báo đã đọc.',
      'NOTIFICATION_MARK_READ_FAILED',
    );
  }
}

function createNotificationError(message: string, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  return error;
}

function getResponseMessage(data: unknown): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === 'string' || typeof data === 'number') {
    return String(data);
  }

  if (typeof data !== 'object') {
    return null;
  }

  const payload = data as BackendResponse<unknown>;

  if (Array.isArray(payload.message)) {
    return payload.message.join(', ');
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  return null;
}

function normalizeNotificationError(
  error: unknown,
  fallbackMessage: string,
  fallbackCode = 'NOTIFICATION_API_FAILED',
): AppError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message = getResponseMessage(error.response?.data) || error.message || fallbackMessage;

    if (status === 401 || status === 403) {
      return createNotificationError(message, 'NOTIFICATION_UNAUTHORIZED');
    }

    if (status === 404) {
      return createNotificationError(message, 'NOTIFICATION_NOT_FOUND');
    }

    return createNotificationError(message, fallbackCode);
  }

  if (error instanceof Error) {
    return createNotificationError(error.message || fallbackMessage, fallbackCode);
  }

  return createNotificationError(fallbackMessage, fallbackCode);
}

function unwrapBackendData<T>(payload: BackendResponse<T> | T): T | undefined {
  if (payload && typeof payload === 'object' && ('data' in payload || 'statusCode' in payload)) {
    return (payload as BackendResponse<T>).data;
  }

  return payload as T;
}

function validateId(value: string, message: string, code: string): void {
  if (!value) {
    throw createNotificationError(message, code);
  }
}

function normalizeNotifications(data: BackendNotification[] | undefined): NotificationItem[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map(normalizeNotification)
    .filter((item) => item.id)
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
}

function normalizeNotification(payload: BackendNotification): NotificationItem {
  const id = payload.notificationID || payload.id || '';

  return {
    notificationID: id,
    id,
    senderID: payload.senderID || null,
    receiverID: payload.receiverID || '',
    content: translateNotificationContent(payload.content || ''),
    createdAt: toIsoString(payload.createdAt),
    isRead: Boolean(payload.isRead),
    relatedType: payload.relatedType || null,
    sender: payload.sender || null,
    targetUrl: getTargetUrl(payload),
  };
}

function getTargetUrl(payload: BackendNotification): string | undefined {
  return (
    payload.targetUrl ||
    payload.actionUrl ||
    payload.relatedUrl ||
    payload.url ||
    payload.link ||
    payload.path ||
    undefined
  );
}

function toIsoString(value: string | Date | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function toTimestamp(value: string): number {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function translateNotificationContent(content: string): string {
  const normalized = content.trim();

  if (!normalized) {
    return '';
  }

  const leaveReview = normalized.match(
    /^Your leave application from (.+) to (.+) has been (approved|rejected)\.(?: Reason: (.*))?$/i,
  );
  if (leaveReview) {
    const [, startDate, endDate, status, reason] = leaveReview;
    const statusText = status.toLowerCase() === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';
    const reasonText = reason ? ` Lý do: ${reason}` : '';

    return `Đơn nghỉ phép từ ${formatDisplayDate(startDate)} đến ${formatDisplayDate(endDate)} ${statusText}.${reasonText}`;
  }

  const correctionReview = normalized.match(
    /^Your timesheet correction request was (APPROVED|REJECTED|approved|rejected)\.(?: Reason: (.*))?$/i,
  );
  if (correctionReview) {
    const [, status, reason] = correctionReview;
    const statusText = status.toLowerCase() === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';
    const reasonText = reason ? ` Lý do: ${reason}` : '';

    return `Yêu cầu chỉnh sửa bảng công của bạn ${statusText}.${reasonText}`;
  }

  const correctionCreate = normalized.match(
    /^(.+) requested a timesheet correction for (\d{1,2})\/(\d{4})\.$/i,
  );
  if (correctionCreate) {
    const [, employeeName, month, year] = correctionCreate;

    return `${employeeName} đã gửi yêu cầu chỉnh sửa bảng công tháng ${month}/${year}.`;
  }

  const monthlySubmit = normalized.match(
    /^Monthly timesheet (\d{1,2})\/(\d{4}) from (.+) needs review\.$/i,
  );
  if (monthlySubmit) {
    const [, month, year, employeeName] = monthlySubmit;

    return `Bảng công tháng ${month}/${year} của ${employeeName} đang chờ duyệt.`;
  }

  const monthlyReview = normalized.match(
    /^Your monthly timesheet (\d{1,2})\/(\d{4}) was (approved|rejected)\.(?: Reason: (.*))?$/i,
  );
  if (monthlyReview) {
    const [, month, year, status, reason] = monthlyReview;
    const statusText = status.toLowerCase() === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';
    const reasonText = reason ? ` Lý do: ${reason}` : '';

    return `Bảng công tháng ${month}/${year} của bạn ${statusText}.${reasonText}`;
  }

  const leaveCreate = normalized.match(
    /^New leave application submitted by (.+) from (.+) to (.+) \((\d+) days?\)\.$/i,
  );
  if (leaveCreate) {
    const [, employeeName, startDate, endDate, duration] = leaveCreate;

    return `${employeeName} đã gửi đơn nghỉ phép từ ${formatDisplayDate(startDate)} đến ${formatDisplayDate(endDate)} (${duration} ngày).`;
  }

  const warning = normalized.match(/^You have received a warning: (.+)$/i);
  if (warning) {
    return `Bạn có cảnh báo mới: ${warning[1]}`;
  }

  return translateKnownTerms(normalized);
}

function formatDisplayDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

function translateKnownTerms(value: string): string {
  return value
    .replace(/\bAPPROVED\b/g, 'đã được duyệt')
    .replace(/\bREJECTED\b/g, 'đã bị từ chối')
    .replace(/\bapproved\b/g, 'đã được duyệt')
    .replace(/\brejected\b/g, 'đã bị từ chối')
    .replace(/\bReason:/g, 'Lý do:')
    .replace(/\btimesheet correction request\b/gi, 'yêu cầu chỉnh sửa bảng công')
    .replace(/\bleave application\b/gi, 'đơn nghỉ phép')
    .replace(/\bmonthly timesheet\b/gi, 'bảng công tháng');
}
