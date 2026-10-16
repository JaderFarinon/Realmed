const dns = require("node:dns/promises");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const { isPng, isJpeg } = require("./imageAssetService");
const { fail } = require("./inventoryWorkflow");
const isPublicAddress = (address) => {
  if (net.isIP(address) === 6)
    return (
      /^[23][0-9a-f]{0,3}:/i.test(address) &&
      !address.toLowerCase().startsWith("2001:db8:")
    );
  if (net.isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 0 && c === 2))) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && [18, 19, 51].includes(b)) ||
    (a === 203 && b === 0 && c === 113)
  );
};
async function downloadPhoto(value, redirects = 0) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("URL da imagem inválida.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    fail("Use uma URL pública HTTP ou HTTPS de imagem.");
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    fail("A URL deve apontar para um endereço público.");
  const result = await new Promise((resolve, reject) => {
    const chosen = addresses[0];
    const request = (url.protocol === "https:" ? https : http).get(
      url,
      {
        lookup: (_host, opts, callback) =>
          opts.all
            ? callback(null, [chosen])
            : callback(null, chosen.address, chosen.family),
        timeout: 10000,
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          resolve({ redirect: res.headers.location });
          return;
        }
        if (
          res.statusCode !== 200 ||
          Number(res.headers["content-length"]) > 2 * 1024 * 1024
        ) {
          res.resume();
          reject(
            Object.assign(
              new Error("A imagem não está disponível ou excede 2 MB."),
              { status: 422 },
            ),
          );
          return;
        }
        const chunks = [];
        let size = 0;
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) {
            res.destroy();
            reject(
              Object.assign(new Error("A imagem excede 2 MB."), {
                status: 422,
              }),
            );
          } else chunks.push(chunk);
        });
        res.on("end", () => resolve({ buffer: Buffer.concat(chunks) }));
        res.on("error", reject);
      },
    );
    request.on("timeout", () => request.destroy(new Error("Timeout")));
    request.on("error", reject);
  });
  if (result.redirect) {
    if (redirects >= 3) fail("Muitos redirecionamentos na URL da imagem.");
    return downloadPhoto(new URL(result.redirect, url).href, redirects + 1);
  }
  const b = result.buffer;
  const mime = isPng(b)
    ? "image/png"
    : isJpeg(b)
      ? "image/jpeg"
      : b.length > 12 &&
          b.subarray(0, 4).toString() === "RIFF" &&
          b.subarray(8, 12).toString() === "WEBP"
        ? "image/webp"
        : null;
  if (!mime) fail("A URL deve retornar uma imagem PNG, JPG ou WEBP válida.");
  return { buffer: b, mime };
}
module.exports = { downloadPhoto, isPublicAddress };
