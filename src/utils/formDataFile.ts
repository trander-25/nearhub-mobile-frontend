type FormDataFileInput = {
  uri: string
  fileName?: string | null
  mimeType?: string | null
  fallbackName: string
}

export function createFormDataImageFile(input: FormDataFileInput) {
  const type = input.mimeType || 'image/jpeg';
  const extension = type.includes('/') ? type.split('/')[1] : 'jpg';
  const name = input.fileName || `${input.fallbackName}.${extension}`;

  return {
    uri: input.uri,
    name,
    type,
  } as unknown as Blob;
}
