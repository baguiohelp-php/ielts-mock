export function jsonRes(data: any, init: number = 200) {
  return new Response(JSON.stringify(data), { status: init, headers: { "content-type": "application/json" } });
}
