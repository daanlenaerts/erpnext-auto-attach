import path from "node:path";

export interface UploadAttachmentOptions {
    url: string;
    key: string;
    secret: string;
    doctype: string;
    name: string;
    file: Blob;
    filename: string;
}

export async function uploadAttachment(opts: UploadAttachmentOptions) {
    const formData = new FormData();
    const filename = path.basename(opts.filename);
    formData.append('file', opts.file, filename);
    formData.append('doctype', opts.doctype);
    formData.append('docname', opts.name);
    formData.append('is_private', '1');

    const options = {
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + Buffer.from(`${opts.key}:${opts.secret}`).toString('base64')
            // 'Content-Type' is set automatically by FormData
        },
        body: formData as any
    };

    const url = opts.url + `/api/method/upload_file`;
    const res = await fetch(url, options);

    if (res.ok) {
        return (await res.json()).message;
    } else {
        const body = await res.text();
        console.error(body);
        throw new Error(body);
    }
} 