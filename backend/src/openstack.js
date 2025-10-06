import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const {
  OS_AUTH_URL,
  OS_USERNAME,
  OS_PASSWORD,
  OS_PROJECT_NAME,
  OS_PROJECT_ID,
} = process.env;

const openstack = axios.create({
  baseURL: OS_AUTH_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 10000,
});

let cachedToken = null;
let cachedCatalog = null;
let cachedExpiresAt = null;

function isExpiringSoon(iso, skewSec = 120) {
  if (!iso) return true;
  const now = Date.now();
  const exp = new Date(iso).getTime();
  return exp - now < skewSec * 1000;
}

async function keystoneLogin({ username, password }) {
  const resp = await openstack.post(
    "https://cloud-identity.uitiot.vn/v3/auth/tokens",
    {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              name: username,
              domain: { name: "Default" },
              password,
            },
          },
        },
        scope: {
          project: {
            name: "NT533.P21",
            domain: { name: "Default" },
          },
        },
      },
    }
  );

  cachedToken = resp.headers["x-subject-token"];
  cachedCatalog = resp.data.token.catalog;
  cachedExpiresAt = resp.data.token.expires_at;

  return {
    token: cachedToken,
    catalog: cachedCatalog,
    user: resp.data.token.user,
    project: resp.data.token.project,
  };
}

async function ensureToken() {
  if (!cachedToken || !cachedCatalog || isExpiringSoon(cachedExpiresAt)) {
    if (!OS_USERNAME || !OS_PASSWORD) {
      throw new Error(
        "Missing OS_USERNAME/OS_PASSWORD in .env for ensureToken()"
      );
    }
    await keystoneLogin({ username: OS_USERNAME, password: OS_PASSWORD });
  }
  return { token: cachedToken, catalog: cachedCatalog };
}

export async function SignInAndGetToken(req) {
  const { username, password } = req.body || {};
  const resp = await openstack.post(
    "https://cloud-identity.uitiot.vn/v3/auth/tokens",
    {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: {
              name: username,
              domain: { name: "Default" },
              password,
            },
          },
        },
        scope: {
          project: {
            name: "NT533.P21",
            domain: { name: "Default" },
          },
        },
      },
    }
  );

  cachedToken = resp.headers["x-subject-token"];
  cachedCatalog = resp.data.token.catalog;
  cachedExpiresAt = resp.data.token.expires_at;

  return {
    token: cachedToken,
    catalog: cachedCatalog,
    user: resp.data.token.user,
    project: resp.data.token.project,
  };
}

let networkIdcached = null;

export async function createNetworkService(req, res) {
  const { name, admin_state_up = true } = req.body;
  await ensureToken();

  if (!cachedToken || !cachedCatalog) {
    throw new Error("Not signed in. Please call /signin first.");
  }
  if (!name) throw new Error("Network name is required");

  const neutron = axios.create({
    baseURL: "https://cloud-network.uitiot.vn/v2.0",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Auth-Token": cachedToken,
    },
    timeout: 15000,
  });

  const resp = await neutron.post("/networks", {
    network: {
      name,
      admin_state_up,
    },
  });

  networkIdcached = resp.data?.network?.id || null;
  return resp.data;
}

export async function createSubnetService(req, res) {
  const { name, cidr, ip_version = 4 } = req.body;
  const network_id = req.body.network_id ?? networkIdcached;
  await ensureToken();

  if (!cachedToken || !cachedCatalog) {
    throw new Error("Not signed in. Please call /signin first.");
  }
  if (!name) throw new Error("Subnet name is required");
  if (!cidr) throw new Error("CIDR is required");
  if (!network_id) throw new Error("Network ID is required");

  const neutron = axios.create({
    baseURL: "https://cloud-network.uitiot.vn/v2.0",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Auth-Token": cachedToken,
    },
    timeout: 15000,
  });

  const resp = await neutron.post("/subnets", {
    subnet: {
      name,
      cidr,
      ip_version,
      network_id,
    },
  });

  return resp.data;
}

export async function createPortService(req, res) {
  const {
    sg_names,
    network_id,
    fixed_ips,
    subnet_id,
    ip_address,
    port_security_enabled = false,
    admin_state_up = true,
  } = req.body;

  await ensureToken();

  const namesArr = Array.isArray(sg_names)
    ? sg_names
    : sg_names
    ? [sg_names]
    : [];

  if (!cachedToken || !cachedCatalog) {
    throw new Error("Not signed in. Please call /signin first.");
  }

  const ids = namesArr.length
    ? await getSecurityGroupIdsByNames(namesArr) // bạn phải có hàm này
    : undefined;

  const security_groups =
    port_security_enabled && Array.isArray(ids) && ids.length ? ids : undefined;

  if (!network_id) throw new Error("Network ID is required");

  let fixedIpsPayload = [];
  if (Array.isArray(fixed_ips) && fixed_ips.length > 0) {
    fixedIpsPayload = fixed_ips.map((ip) => {
      if (!ip.subnet_id) throw new Error("fixed_ips[].subnet_id is required");
      return {
        subnet_id: ip.subnet_id,
        ...(ip.ip_address ? { ip_address: ip.ip_address } : {}),
      };
    });
  } else if (subnet_id) {
    fixedIpsPayload = [
      {
        subnet_id,
        ...(ip_address ? { ip_address } : {}),
      },
    ];
  }

  const neutron = axios.create({
    baseURL: "https://cloud-network.uitiot.vn/v2.0",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Auth-Token": cachedToken,
    },
    timeout: 15000,
  });

  const body = {
    port: {
      admin_state_up,
      port_security_enabled,
      network_id,
      ...(Array.isArray(security_groups) ? { security_groups } : {}),
      ...(fixedIpsPayload.length ? { fixed_ips: fixedIpsPayload } : {}),
    },
  };

  const resp = await neutron.post("/ports", body);
  return resp.data;
}

export async function createPortWithSGNames(req, res) {
  const {
    sg_names = [], // ví dụ: ["default", "web-servers"]
    network_id,
    subnet_id,
    ip_address,
    port_security_enabled = true,
    admin_state_up = true,
  } = req.body || {};

  const security_groups = sg_names.length
    ? await getSecurityGroupIdsByNames(sg_names)
    : undefined;

  return createPortService(
    {
      body: {
        network_id,
        subnet_id,
        ip_address,
        port_security_enabled,
        admin_state_up,
        security_groups,
      },
    },
    res
  );
}

export async function createNetSubnetPortService(req, res) {
  await ensureToken();
  if (!cachedToken || !cachedCatalog)
    throw new Error("Not signed in. Please call /signin first.");

  const neutron = axios.create({
    baseURL: "https://cloud-network.uitiot.vn/v2.0",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Auth-Token": cachedToken,
    },
    timeout: 15000,
  });

  const { network, subnet, port } = req.body || {};
  if (!network?.name) throw new Error("network.name is required");
  if (!subnet?.name || !subnet?.cidr)
    throw new Error("subnet.name and subnet.cidr are required");

  const netResp = await neutron.post("/networks", {
    network: {
      name: network.name,
      admin_state_up: true,
    },
  });
  const network_id = netResp.data?.network?.id;
  if (!network_id) throw new Error("Failed to get network id");

  const subResp = await neutron.post("/subnets", {
    subnet: {
      name: subnet.name,
      cidr: subnet.cidr,
      ip_version: subnet.ip_version ?? 4,
      network_id,
    },
  });
  const subnet_id = subResp.data?.subnet?.id;
  if (!subnet_id) throw new Error("Failed to get subnet id");

  const fixed_ips =
    Array.isArray(port?.fixed_ips) && port.fixed_ips.length > 0
      ? port.fixed_ips.map((ip) => ({
          subnet_id: ip.subnet_id ?? subnet_id,
          ...(ip.ip_address ? { ip_address: ip.ip_address } : {}),
        }))
      : [{ subnet_id }];

  const portResp = await neutron.post("/ports", {
    port: {
      admin_state_up: true,
      port_security_enabled: false,
      security_groups: null,
      network_id,
      fixed_ips,
    },
  });

  return {
    network: netResp.data.network,
    subnet: subResp.data.subnet,
    port: portResp.data.port,
    ids: { network_id, subnet_id, port_id: portResp.data.port?.id },
  };
}

export async function listImagesService(req, res) {
  await ensureToken();
  if (!cachedToken || !cachedCatalog)
    throw new Error("Not signed in. Please call /signin first.");

  const glanceBase = "https://cloud-image.uitiot.vn/v2.0";
  const glance = axios.create({
    baseURL: glanceBase,
    headers: {
      "X-Auth-Token": cachedToken,
      Accept: "application/json",
    },
    timeout: 15000,
  });

  const { limit = 50, name, visibility } = req.query || {};
  const params = {};
  if (limit) params.limit = limit;
  if (name) params.name = name;
  if (visibility) params.visibility = visibility;

  const resp = await glance.get("/images", { params });
  return resp.data;
}

export async function listFlavorsService(req, res) {
  await ensureToken();
  if (!cachedToken || !cachedCatalog)
    throw new Error("Not signed in. Please call /signin first.");

  const compute = axios.create({
    baseURL:
      "https://cloud-compute.uitiot.vn/v2.1/e5546ae00fff4785910a067269b5725a",
    headers: {
      Accept: "application/json",
      "X-Auth-Token": cachedToken,
    },
    timeout: 15000,
  });

  const path = "/flavors";
  const resp = await compute.get(path);
  return resp.data;
}

export async function listSecurityGroupsService(req, res) {
  await ensureToken();
  if (!cachedToken || !cachedCatalog)
    throw new Error("Not signed in. Please call /signin first.");

  const neutron = axios.create({
    baseURL: "https://cloud-network.uitiot.vn/v2.0",
    headers: {
      Accept: "application/json",
      "X-Auth-Token": cachedToken,
    },
    timeout: 15000,
  });

  const resp = await neutron.get("/security-groups");
  return resp.data;
}

export async function getSecurityGroupIdsByNames(names = []) {
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error("Security group names array is required");
  }

  await ensureToken();
  if (!cachedToken || !cachedCatalog) {
    throw new Error("Not signed in. Please call /signin first.");
  }

  const neutron = axios.create({
    baseURL: "https://cloud-network.uitiot.vn/v2.0",
    headers: { Accept: "application/json", "X-Auth-Token": cachedToken },
    timeout: 15000,
  });

  const resp = await neutron.get("/security-groups");
  const all = resp.data?.security_groups || [];

  const byName = new Map(all.map((sg) => [sg.name, sg.id]));

  const uuidRe = /^[0-9a-fA-F-]{36}$/;

  const ids = names.map((n) => {
    if (uuidRe.test(n)) return n; // đã là UUID
    const id = byName.get(n);
    if (!id) throw new Error(`Security group not found: ${n}`);
    return id;
  });

  return Array.from(new Set(ids));
}

export async function listKeyPairs(req, res) {
  await ensureToken();
  if (!cachedToken || !cachedCatalog) {
    throw new Error("Not signed in. Please call /signin first.");
  }

  const compute = axios.create({
    baseURL:
      "https://cloud-compute.uitiot.vn/v2.1/e5546ae00fff4785910a067269b5725a",
    headers: {
      Accept: "application/json",
      "X-Auth-Token": cachedToken,
    },
    timeout: 15000,
  });

  const resp = await compute.get("/os-keypairs");
  return resp.data;
}

function glanceClient() {
  return axios.create({
    baseURL: "https://cloud-image.uitiot.vn",
    headers: { "X-Auth-Token": cachedToken, Accept: "application/json" },
    timeout: 15000,
  });
}
function computeClient() {
  return axios.create({
    baseURL:
      "https://cloud-compute.uitiot.vn/v2.1/e5546ae00fff4785910a067269b5725a",
    headers: {
      "X-Auth-Token": cachedToken,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 15000,
  });
}

export async function getComputeOptions(req, res) {
  await ensureToken();
  if (!cachedToken || !cachedCatalog)
    throw new Error("Not signed in. Please call /signin first.");

  const [imagesResp, flavorsResp] = await Promise.all([
    glanceClient().get("/v2/images?limit=200"),
    computeClient().get("/flavors/detail"),
  ]);

  return {
    images: (imagesResp.data.images || []).map(
      ({ id, name, visibility, status }) => ({ id, name, visibility, status })
    ),
    flavors: (flavorsResp.data.flavors || []).map(
      ({ id, name, vcpus, ram, disk }) => ({ id, name, vcpus, ram, disk })
    ),
  };
}

async function resolveImageId({ imageRef, imageName }) {
  if (imageRef) return imageRef;
  if (!imageName) throw new Error("imageName or imageRef is required");
  const r = await glanceClient().get("/v2/images", {
    params: { name: imageName },
  });
  const img = (r.data.images || []).find((i) => i.name === imageName);
  if (!img) throw new Error(`Image not found: ${imageName}`);
  return img.id;
}
async function resolveFlavorId({ flavorRef, flavorName }) {
  if (flavorRef) return flavorRef;
  if (!flavorName) throw new Error("flavorName or flavorRef is required");
  const r = await computeClient().get("/flavors/detail");
  const fl = (r.data.flavors || []).find((f) => f.name === flavorName);
  if (!fl) throw new Error(`Flavor not found: ${flavorName}`);
  return fl.id;
}

export async function createInstance(req, res) {
  await ensureToken();
  if (!cachedToken || !cachedCatalog)
    throw new Error("Not signed in. Please call /signin first.");

  const body = req.body || {};
  const serverIn = body.server || {};

  const imageId = await resolveImageId({
    imageRef: serverIn.imageRef,
    imageName: serverIn.imageName,
  });
  const flavorId = await resolveFlavorId({
    flavorRef: serverIn.flavorRef,
    flavorName: serverIn.flavorName,
  });

  const serverPayload = {
    server: {
      name: serverIn.name,
      imageRef: imageId,
      flavorRef: flavorId,
      security_groups: serverIn.security_groups,
      networks: serverIn.networks,
      user_data: Buffer.from(
        `#cloud-config
chpasswd:
  list: |
    root:root
  expire: False
ssh_pwauth: True
`
      ).toString("base64"),
    },
  };

  const resp = await computeClient().post("/servers", serverPayload);
  return resp.data;
}
