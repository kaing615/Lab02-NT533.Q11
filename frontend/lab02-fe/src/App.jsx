import { useEffect, useMemo, useRef, useState } from "react";

const C = {
  bg: "#0b1022",
  bgDeep: "#050816",
  panel: "#0e162e",
  text: "#e5e7eb",
  sub: "#94a3b8",
  border: "#23304a",
  glow: "rgba(59,130,246,.25)",
  ok: "#22c55e",
  warn: "#f59e0b",
  err: "#ef4444",
  blue: "#60a5fa",
};

const S = {
  page: {
    minHeight: "100vh",
    background: `radial-gradient(1200px 700px at 10% -10%, ${C.glow}, transparent 60%), linear-gradient(180deg, #0f172a, #0a1020)`,
    color: C.text,
    fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial",
  },
  wrap: { maxWidth: 1160, margin: "0 auto", padding: 16 },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 9,
    background: "linear-gradient(180deg, rgba(4,7,17,.95), rgba(4,7,17,.75))",
    backdropFilter: "saturate(1.2) blur(8px)",
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    boxShadow: "0 10px 36px rgba(0,0,0,.35)",
  },
  card: {
    background: `linear-gradient(180deg, ${C.panel}, ${C.bgDeep})`,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0 12px 32px rgba(0,0,0,.35)",
  },
  h2: { margin: 0, fontSize: 20 },
  h3: { margin: "0 0 10px", fontSize: 16 },
  label: {
    fontSize: 12,
    color: C.sub,
    display: "block",
    margin: "10px 0 6px",
  },
  input: {
    width: "100%",
    background: C.bg,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "11px 12px",
    outline: "none",
    transition: "box-shadow .2s,border-color .2s",
  },
  inputFocus: {
    boxShadow: `0 0 0 3px ${C.glow}`,
    borderColor: "#3b82f6",
  },
  grid: (cols = 2) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
    gap: 10,
  }),
  btn: {
    cursor: "pointer",
    border: `1px solid ${C.ok}`,
    padding: "10px 14px",
    borderRadius: 12,
    color: "#081018",
    background: C.ok,
    fontWeight: 700,
    transition: "transform .05s ease",
  },
  btnBlue: {
    cursor: "pointer",
    border: `1px solid #1d4ed8`,
    padding: "10px 14px",
    borderRadius: 12,
    color: "#081018",
    background: C.blue,
    fontWeight: 700,
    transition: "transform .05s ease",
  },
  btnGhost: {
    cursor: "pointer",
    border: `1px dashed ${C.border}`,
    padding: "10px 14px",
    borderRadius: 12,
    color: C.text,
    background: "transparent",
  },
  hint: { color: C.sub, fontSize: 12 },
  pill: (bg) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: bg,
    color: "#081018",
  }),
};

function Field({ label, children }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

function Badge({ tone = "info", children }) {
  const map = {
    info: "#93c5fd",
    ok: "#86efac",
    err: "#fca5a5",
    warn: "#fde68a",
  };
  return <span style={S.pill(map[tone] || map.info)}>{children}</span>;
}

function useFocusStyle() {
  const [isFocus, set] = useState(false);
  return {
    onFocus: () => set(true),
    onBlur: () => set(false),
    style: isFocus ? S.inputFocus : undefined,
  };
}

function nowISO() {
  const d = new Date();
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function LogViewer({ entries, onClear, onCopy, onDownload }) {
  const [q, setQ] = useState("");
  const [levels, setLevels] = useState({ info: true, ok: true, err: true });
  const boxRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight + 400;
  }, [entries.length]);

  const filtered = entries.filter(
    (e) =>
      levels[e.level] &&
      (q
        ? JSON.stringify(e.payload).toLowerCase().includes(q.toLowerCase())
        : true)
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["info", "ok", "err"].map((lv) => (
            <button
              key={lv}
              onClick={() => setLevels((m) => ({ ...m, [lv]: !m[lv] }))}
              style={{
                ...S.btnGhost,
                padding: "6px 10px",
                border: `1px solid ${levels[lv] ? "#3b82f6" : C.border}`,
                background: levels[lv] ? "rgba(59,130,246,.12)" : "transparent",
                fontSize: 12,
              }}
            >
              {lv.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          placeholder="Tìm trong log…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...S.input, maxWidth: 280 }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button style={S.btnGhost} onClick={onCopy}>
            Copy
          </button>
          <button style={S.btnGhost} onClick={onDownload}>
            Tải .log
          </button>
          <button style={S.btn} onClick={onClear}>
            Xoá log
          </button>
        </div>
      </div>

      <div
        ref={boxRef}
        style={{
          background: C.bgDeep,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 12,
          minHeight: 200,
          maxHeight: 360,
          overflow: "auto",
          fontFamily: "ui-monospace,SFMono-Regular,Menlo,Consolas",
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: C.sub }}>Không có log hiển thị…</div>
        ) : (
          filtered.map((e, i) => (
            <div
              key={i}
              style={{
                padding: "6px 8px",
                borderRadius: 8,
                background:
                  e.level === "err"
                    ? "rgba(239,68,68,.08)"
                    : e.level === "ok"
                    ? "rgba(34,197,94,.08)"
                    : "transparent",
                border: e.level !== "info" ? `1px solid ${C.border}` : "none",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <Badge
                  tone={
                    e.level === "err" ? "err" : e.level === "ok" ? "ok" : "info"
                  }
                >
                  {e.level.toUpperCase()}
                </Badge>
                <span style={{ color: C.sub }}>{e.time}</span>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {typeof e.payload === "string"
                  ? e.payload
                  : JSON.stringify(e.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

async function fetchJSON(
  baseUrl,
  path,
  { method = "GET", body, headers } = {}
) {
  const url = path.startsWith("http")
    ? path
    : baseUrl.replace(/\/$/, "") + path;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:4000/api");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [logs, setLogs] = useState([]);
  function log(payload, level = "info") {
    setLogs((xs) => [...xs, { level, payload, time: nowISO() }]);
  }
  const clearLogs = () => setLogs([]);
  const copyLogs = async () => {
    const txt = logs
      .map(
        (l) =>
          `[${l.time}] ${l.level.toUpperCase()} ${
            typeof l.payload === "string"
              ? l.payload
              : JSON.stringify(l.payload)
          }`
      )
      .join("\n");
    await navigator.clipboard.writeText(txt);
    toast("Đã copy logs vào clipboard");
  };
  const downloadLogs = () => {
    const blob = new Blob(
      [
        logs
          .map(
            (l) =>
              `[${l.time}] ${l.level.toUpperCase()} ${
                typeof l.payload === "string"
                  ? l.payload
                  : JSON.stringify(l.payload)
              }`
          )
          .join("\n"),
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openstack-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [images, setImages] = useState([]);
  const [flavors, setFlavors] = useState([]);
  const [secGroups, setSecGroups] = useState([]);

  const [networkId, setNetworkId] = useState("");
  const [subnetId, setSubnetId] = useState("");
  const [portId, setPortId] = useState("");

  const [netName, setNetName] = useState("");
  const [subName, setSubName] = useState("");
  const [cidr, setCidr] = useState("192.168.11.0/24");
  const [portIp, setPortIp] = useState("");
  const [portSgNames, setPortSgNames] = useState([]);
  const [cNetName, setCNetName] = useState("");
  const [cSubName, setCSubName] = useState("");
  const [cCidr, setCCidr] = useState("192.168.22.0/24");
  const [cIp, setCIp] = useState("");
  const [vmName, setVmName] = useState("");
  const [imageRef, setImageRef] = useState("");
  const [flavorRef, setFlavorRef] = useState("");
  const [sgSelected, setSgSelected] = useState([]);
  const tokenPreview = useMemo(() => "(server-cached)", []);

  const [cloudInit, setCloudInit] = useState(
    `#cloud-config\nchpasswd:\n  list: |\n    root:root\n  expire: False\nssh_pwauth: True\n`
  );

  const fFocus = useFocusStyle();
  const pFocus = useFocusStyle();

  const [toastMsg, setToastMsg] = useState("");
  function toast(m) {
    setToastMsg(m);
    setTimeout(() => setToastMsg(""), 2200);
  }

  const [loading, setLoading] = useState({
    signin: false,
    catalogs: false,
    createAll: false,
    createNet: false,
    createSub: false,
    createPort: false,
    createVm: false,
  });

  const withLoad = async (key, fn) => {
    setLoading((s) => ({ ...s, [key]: true }));
    try {
      await fn();
    } finally {
      setLoading((s) => ({ ...s, [key]: false }));
    }
  };

  const signin = async () =>
    withLoad("signin", async () => {
      if (!username || !password) return log("Thiếu username/password", "err");
      const r = await fetchJSON(baseUrl, "/signin", {
        method: "POST",
        body: { username, password },
      });
      if (r.ok) {
        log("Đăng nhập thành công (token được cache ở backend).", "ok");
        toast("Đăng nhập OK");
      } else {
        log(r.data || r.status, "err");
      }
    });

  const loadCatalogs = async () =>
    withLoad("catalogs", async () => {
      const [ir, fr, sgr] = await Promise.all([
        fetchJSON(baseUrl, "/images"),
        fetchJSON(baseUrl, "/flavors"),
        fetchJSON(baseUrl, "/security-groups"),
      ]);
      if (ir.ok) {
        setImages(ir.data.images || ir.data);
        log({ images_count: (ir.data.images || ir.data || []).length }, "ok");
      } else log(ir.data, "err");
      if (fr.ok) {
        const list = fr.data.flavors || fr.data;
        setFlavors(list);
        log({ flavors_count: list.length }, "ok");
      } else log(fr.data, "err");
      if (sgr.ok) {
        const list = sgr.data.security_groups || sgr.data;
        setSecGroups(list);
        log({ security_groups_count: (list || []).length }, "ok");
      } else log(sgr.data, "err");
    });

  const createNetwork = async () =>
    withLoad("createNet", async () => {
      if (!netName) return log("Thiếu network name", "err");
      const r = await fetchJSON(baseUrl, "/networks", {
        method: "POST",
        body: { name: netName, admin_state_up: true },
      });
      if (r.ok) {
        const id = r.data?.network?.id;
        setNetworkId(id || "");
        log({ created_network: r.data }, "ok");
        toast("Tạo Network xong");
      } else log(r.data || r.status, "err");
    });

  const createSubnet = async () =>
    withLoad("createSub", async () => {
      if (!subName || !cidr) return log("Thiếu subnet name/cidr", "err");
      if (!networkId) return log("Thiếu network_id cho subnet", "err");
      const r = await fetchJSON(baseUrl, "/subnets", {
        method: "POST",
        body: { name: subName, cidr, network_id: networkId, ip_version: 4 },
      });
      if (r.ok) {
        const id = r.data?.subnet?.id;
        setSubnetId(id || "");
        log({ created_subnet: r.data }, "ok");
        toast("Tạo Subnet xong");
      } else log(r.data || r.status, "err");
    });

  const createPort = async () =>
    withLoad("createPort", async () => {
      if (!networkId) return log("Thiếu network_id cho port", "err");
      const body = {
        network_id: networkId,
        admin_state_up: true,
        port_security_enabled: false,
      };
      if (subnetId || portIp)
        body.fixed_ips = [
          { subnet_id: subnetId, ...(portIp ? { ip_address: portIp } : {}) },
        ];
      if (portSgNames.length) body.security_groups = portSgNames;
      const r = await fetchJSON(baseUrl, "/ports", { method: "POST", body });
      if (r.ok) {
        const id = r.data?.port?.id;
        setPortId(id || "");
        log({ created_port: r.data }, "ok");
        toast("Tạo Port xong");
      } else log(r.data || r.status, "err");
    });

  const createAllInOne = async () =>
    withLoad("createAll", async () => {
      if (!cNetName || !cSubName || !cCidr)
        return log("Thiếu tên/cidr trong tạo nhanh", "err");
      const body = {
        network: { name: cNetName },
        subnet: { name: cSubName, cidr: cCidr, ip_version: 4 },
        port: { fixed_ips: cIp ? [{ ip_address: cIp }] : [] },
      };
      const r = await fetchJSON(baseUrl, "/network/full", {
        method: "POST",
        body,
      });
      if (r.ok) {
        setNetworkId(r.data?.ids?.network_id || "");
        setSubnetId(r.data?.ids?.subnet_id || "");
        setPortId(r.data?.ids?.port_id || "");
        log({ created_all_in_one: r.data }, "ok");
        toast("Done: Network+Subnet+Port");
      } else log(r.data || r.status, "err");
    });

  const createInstance = async () =>
    withLoad("createVm", async () => {
      if (!imageRef || !flavorRef || !(networkId || portId))
        return log("Thiếu image/flavor/network hoặc port.", "err");
      const security_groups = (
        sgSelected.length ? sgSelected : ["default"]
      ).map((n) => ({ name: n }));
      const networks = portId ? [{ port: portId }] : [{ uuid: networkId }];
      const server = {
        name: vmName || `vm-${Date.now()}`,
        imageRef,
        flavorRef,
        security_groups,
        networks,
        user_data_plain: cloudInit,
      };
      const r = await fetchJSON(baseUrl, "/servers", {
        method: "POST",
        body: { server },
      });
      if (r.ok) {
        log({ created_server: r.data }, "ok");
        toast("Tạo Instance thành công");
        alert("Tạo instance thành công!");
      } else {
        log(r.data || r.status, "err");
        if (r.data?.forbidden?.message?.includes("Quota exceeded"))
          alert(
            "Quota RAM đã hết. Hãy xoá/resize VM hoặc chọn flavor nhỏ hơn."
          );
      }
    });

  const Btn = ({ loading, children, kind = "ok", ...rest }) => (
    <button
      {...rest}
      style={{
        ...(kind === "ok" ? S.btn : kind === "blue" ? S.btnBlue : S.btnGhost),
        opacity: loading ? 0.7 : 1,
        pointerEvents: loading ? "none" : "auto",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {loading ? "Đang chạy…" : children}
    </button>
  );

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.header}>
          <h2 style={S.h2}>
            OpenStack Lab02 API — Nguyễn Đình Tâm · Huỳnh Lê Đại Thắng
          </h2>
          <div style={S.hint}>
            Đăng nhập → tạo tài nguyên (Network/Subnet/Port/All-in-one) → tạo
            Instance → xem log
          </div>
        </div>

        <section style={S.card}>
          <h3 style={S.h3}>1) Đăng nhập & Danh mục</h3>
          <div style={S.grid(3)}>
            <Field label="Username">
              <input
                style={{ ...S.input, ...fFocus.style }}
                {...fFocus}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                style={{ ...S.input, ...pFocus.style }}
                {...pFocus}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Btn loading={loading.signin} onClick={signin}>
              Đăng nhập
            </Btn>
            <Btn kind="blue" loading={loading.catalogs} onClick={loadCatalogs}>
              Load images / flavors / sec-groups
            </Btn>
            <span style={S.hint}>
              Token: <b style={{ color: C.text }}>{tokenPreview}</b> (cached ở
              server)
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Badge tone="info">Images: {images.length}</Badge>
              <Badge tone="info">Flavors: {flavors.length}</Badge>
              <Badge tone="info">SecGroups: {secGroups.length}</Badge>
            </div>
          </div>
        </section>

        <section style={S.card}>
          <h3 style={S.h3}>2) Tạo Network / Subnet / Port (riêng lẻ)</h3>

          <div style={S.grid(3)}>
            <div>
              <Field label="Network name">
                <input
                  style={S.input}
                  placeholder="nhom36_net"
                  value={netName}
                  onChange={(e) => setNetName(e.target.value)}
                />
              </Field>
              <Btn loading={loading.createNet} onClick={createNetwork}>
                Tạo Network
              </Btn>
            </div>

            <div>
              <Field label="Subnet name">
                <input
                  style={S.input}
                  placeholder="nhom36_sub"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                />
              </Field>
              <Field label="CIDR">
                <input
                  style={S.input}
                  placeholder="192.168.11.0/24"
                  value={cidr}
                  onChange={(e) => setCidr(e.target.value)}
                />
              </Field>
              <Btn loading={loading.createSub} onClick={createSubnet}>
                Tạo Subnet
              </Btn>
            </div>

            <div>
              <Field label="Port IP (optional)">
                <input
                  style={S.input}
                  placeholder="192.168.11.10"
                  value={portIp}
                  onChange={(e) => setPortIp(e.target.value)}
                />
              </Field>
              <Field label="Security groups cho port (tên, chọn nhiều)">
                <select
                  multiple
                  style={{ ...S.input, minHeight: 42 }}
                  value={portSgNames}
                  onChange={(e) =>
                    setPortSgNames(
                      Array.from(e.target.selectedOptions).map((o) => o.value)
                    )
                  }
                >
                  {(secGroups || []).map((sg) => (
                    <option key={sg.id || sg.name} value={sg.name}>
                      {sg.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Btn loading={loading.createPort} onClick={createPort}>
                Tạo Port
              </Btn>
            </div>
          </div>

          <div style={{ marginTop: 8, ...S.grid(3) }}>
            <Field label="network_id">
              <input
                style={S.input}
                value={networkId}
                onChange={(e) => setNetworkId(e.target.value)}
              />
            </Field>
            <Field label="subnet_id">
              <input
                style={S.input}
                value={subnetId}
                onChange={(e) => setSubnetId(e.target.value)}
              />
            </Field>
            <Field label="port_id">
              <input
                style={S.input}
                value={portId}
                onChange={(e) => setPortId(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section style={S.card}>
          <h3 style={S.h3}>3) Tạo nhanh Network + Subnet + Port (1 lần)</h3>
          <div style={S.grid(3)}>
            <Field label="Network name">
              <input
                style={S.input}
                placeholder="fast_net"
                value={cNetName}
                onChange={(e) => setCNetName(e.target.value)}
              />
            </Field>
            <div>
              <Field label="Subnet name">
                <input
                  style={S.input}
                  placeholder="fast_sub"
                  value={cSubName}
                  onChange={(e) => setCSubName(e.target.value)}
                />
              </Field>
              <Field label="CIDR">
                <input
                  style={S.input}
                  placeholder="192.168.22.0/24"
                  value={cCidr}
                  onChange={(e) => setCCidr(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Port IP (optional)">
              <input
                style={S.input}
                placeholder="192.168.22.10"
                value={cIp}
                onChange={(e) => setCIp(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ marginTop: 8 }}>
            <Btn loading={loading.createAll} onClick={createAllInOne}>
              Tạo Network + Subnet + Port
            </Btn>
          </div>
          <div style={{ marginTop: 8, ...S.grid(3) }}>
            <Field label="network_id">
              <input
                style={S.input}
                value={networkId}
                onChange={(e) => setNetworkId(e.target.value)}
              />
            </Field>
            <Field label="subnet_id">
              <input
                style={S.input}
                value={subnetId}
                onChange={(e) => setSubnetId(e.target.value)}
              />
            </Field>
            <Field label="port_id">
              <input
                style={S.input}
                value={portId}
                onChange={(e) => setPortId(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section style={S.card}>
          <h3 style={S.h3}>4) Tạo Instance</h3>
          <div style={S.grid(2)}>
            <Field label="Tên máy ảo">
              <input
                style={S.input}
                placeholder="nhom36_PC1"
                value={vmName}
                onChange={(e) => setVmName(e.target.value)}
              />
            </Field>
            <Field label="Security Groups (Ctrl/Cmd để chọn nhiều)">
              <select
                multiple
                style={{ ...S.input, minHeight: 42 }}
                value={sgSelected}
                onChange={(e) =>
                  setSgSelected(
                    Array.from(e.target.selectedOptions).map((o) => o.value)
                  )
                }
              >
                {(secGroups || []).map((sg) => (
                  <option key={sg.id || sg.name} value={sg.name}>
                    {sg.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={S.grid(3)}>
            <Field label="Image">
              <select
                style={S.input}
                value={imageRef}
                onChange={(e) => setImageRef(e.target.value)}
              >
                <option value="">-- chọn image --</option>
                {images.map((im) => (
                  <option key={im.id} value={im.id}>
                    {im.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Flavor">
              <select
                style={S.input}
                value={flavorRef}
                onChange={(e) => setFlavorRef(e.target.value)}
              >
                <option value="">-- chọn flavor --</option>
                {flavors.map((fl) => (
                  <option key={fl.id} value={fl.id}>
                    {fl.name} — {fl.ram}MB
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <label style={S.label}>Gắn qua network_id hoặc port_id</label>
              <div style={S.hint}>
                Nếu có port_id thì ưu tiên port; nếu trống sẽ dùng network_id
              </div>
            </div>
          </div>

          <div style={S.grid(3)}>
            <Field label="network_id">
              <input
                style={S.input}
                value={networkId}
                onChange={(e) => setNetworkId(e.target.value)}
              />
            </Field>
            <Field label="port_id (optional)">
              <input
                style={S.input}
                value={portId}
                onChange={(e) => setPortId(e.target.value)}
              />
            </Field>
            <Field label="cloud-init (user_data YAML)">
              <textarea
                style={{
                  ...S.input,
                  minHeight: 140,
                  fontFamily: "ui-monospace,SFMono-Regular,Menlo,Consolas",
                }}
                value={cloudInit}
                onChange={(e) => setCloudInit(e.target.value)}
              />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn loading={loading.createVm} onClick={createInstance}>
              Tạo Instance
            </Btn>
          </div>
        </section>

        <section style={S.card}>
          <h3 style={S.h3}>Logs</h3>
          <LogViewer
            entries={logs}
            onClear={clearLogs}
            onCopy={copyLogs}
            onDownload={downloadLogs}
          />
        </section>

        {toastMsg && (
          <div
            style={{
              position: "fixed",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#111827",
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 999,
              padding: "10px 14px",
              boxShadow: "0 10px 24px rgba(0,0,0,.35)",
            }}
          >
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}
