export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

export async function listAppDriveFiles(accessToken: string): Promise<DriveFileItem[]> {
  const query = "trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,createdTime,modifiedTime,webViewLink,size)&orderBy=modifiedTime desc&pageSize=20`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to fetch Google Drive files: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function saveJsonBackupToDrive(
  backupData: Record<string, any>,
  accessToken: string,
  fileName?: string
): Promise<{ fileId: string; webViewLink?: string }> {
  const name = fileName || `Al-Furqaan-Backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const fileContent = JSON.stringify(backupData, null, 2);

  // Use Google Drive multipart upload
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name,
    mimeType: 'application/json',
    description: 'Dijital Al-Furqaan Quran Center Database Snapshot Backup',
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to upload backup to Google Drive: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    fileId: data.id,
    webViewLink: data.webViewLink,
  };
}
