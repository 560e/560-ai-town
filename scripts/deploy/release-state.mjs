import {lstatSync,symlinkSync,unlinkSync} from 'node:fs';

function removeLink(path) {
  let stat;
  try { stat=lstatSync(path); } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return;
    throw error;
  }
  if (!stat.isSymbolicLink()) {
    throw new Error(`候选版本中的 ${path} 不是部署链接，拒绝覆盖。`);
  }
  unlinkSync(path);
}

/**
 * Runtime state deliberately stays outside a candidate while Turbopack builds.
 * It only permits links after a successful build so filesystem tracing cannot
 * follow uploaded assets outside the candidate project root.
 */
export function attachRuntimeState({release, shared, link=symlinkSync}) {
  const env = `${release}/.env.local`;
  const local = `${release}/.local`;
  removeLink(env);
  removeLink(local);
  link(`${shared}/.env.local`, env);
  link(`${shared}/local`, local);
}
