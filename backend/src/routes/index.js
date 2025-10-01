import express from "express";
import {
  SignInAndGetToken,
  createNetworkService,
  createSubnetService,
  createPortService,
  createNetSubnetPortService,
  listImagesService,
  listFlavorsService,
  listSecurityGroupsService,
  listKeyPairs,
  createInstance,
} from "../openstack.js";

const router = express.Router();

router.post("/signin", async (req, res) => {
  try {
    const result = await SignInAndGetToken(req);
    res.json(result);
  } catch (error) {
    console.error("Sign-in failed:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to sign in and get token" });
  }
});

router.post("/networks", async (req, res) => {
  try {
    const result = await createNetworkService(req, res);
    res.json(result);
  } catch (error) {
    console.error(
      "Create network failed:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to create network" });
  }
});

router.post("/subnets", async (req, res) => {
  try {
    const result = await createSubnetService(req, res);
    res.json(result);
  } catch (error) {
    console.error(
      "Create subnet failed:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to create subnet" });
  }
});

router.post("/ports", async (req, res) => {
  try {
    const result = await createPortService(req, res);
    res.json(result);
  } catch (error) {
    console.error("Create port failed:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create port" });
  }
});

router.post("/network/full", async (req, res) => {
  try {
    const result = await createNetSubnetPortService(req, res);
    res.json(result);
  } catch (error) {
    console.log(
      "Create new network failed:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to create new network" });
  }
});

router.get("/images", async (req, res) => {
  try {
    const data = await listImagesService(req, res);
    res.json(data);
  } catch (e) {
    console.error("List images failed:", e.response?.data || e.message);
    res
      .status(e.response?.status || 400)
      .json(e.response?.data || { error: e.message });
  }
});

router.get("/flavors", async (req, res) => {
  try {
    const data = await listFlavorsService(req, res);
    res.json(data);
  } catch (e) {
    console.error("List flavors failed:", e.response?.data || e.message);
    res
      .status(e.response?.status || 400)
      .json(e.response?.data || { error: e.message });
  }
});

router.get("/security-groups", async (req, res) => {
  try {
    const data = await listSecurityGroupsService(req, res);
    res.json(data);
  } catch (e) {
    console.error(
      "List security groups failed:",
      e.response?.data || e.message
    );
    res
      .status(e.response?.status || 400)
      .json(e.response?.data || { error: e.message });
  }
});

router.get("/keypairs", async (req, res) => {
  try {
    const data = await listKeyPairs(req, res);
    res.json(data);
  } catch (e) {
    console.error("List key pairs failed:", e.response?.data || e.message);
    res
      .status(e.response?.status || 400)
      .json(e.response?.data || { error: e.message });
  }
});

router.post("/servers", async (req, res) => {
  try {
    const result = await createInstance(req, res);
    res.json(result);
  } catch (error) {
    console.error(
      "Create instance failed:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to create instance" });
  }
});

export default router;
