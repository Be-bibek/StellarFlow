export const mockWallets = [
  { id: "W1", name: "Payroll Wallet", type: "Core Vault", balance: 1250000.00, currency: "USDC", status: "Active", address: "GBCP...9X12", security: "High" },
  { id: "W2", name: "Operation Wallet", type: "Liquid Buffer", balance: 450500.50, currency: "USDC", status: "Active", address: "GD8A...L2M4", security: "Medium" },
  { id: "W3", name: "Marketing Wallet", type: "Expense", balance: 89000.00, currency: "XLM", status: "Locked", address: "GBZ1...K9Q8", security: "Standard" },
  { id: "W4", name: "Emergency Wallet", type: "Cold Storage", balance: 700000.00, currency: "USDC", status: "Multi-Sig Pending", address: "GAT7...VN3C", security: "Maximum" }
];

export const mockTransactions = [
  { id: "TX-9921", type: "Outbound", amount: -45000, recipient: "GHIJ...88KL", status: "Settled", time: "10m ago" },
  { id: "TX-9920", type: "Inbound", amount: 120000, recipient: "Self (Liquidity)", status: "Settled", time: "1h ago" },
  { id: "TX-9919", type: "Routing", amount: -5000, recipient: "Marketing Vault", status: "Processing", time: "2h ago" },
  { id: "TX-9918", type: "Outbound", amount: -2100.50, recipient: "AWS Services", status: "Failed", time: "5h ago" },
];

export const mockTransits = [
  { id: "TR-001X", amount: 250000, dest: "Vendor Corp", status: "STELLAR CORE LEDGER", progress: 3 },
  { id: "TR-002Y", amount: 50000, dest: "Marketing Dept", status: "ROUTING PIPELINE", progress: 2 },
  { id: "TR-003Z", amount: 1200000, dest: "Cold Storage", status: "AUTHORIZING", progress: 1 },
];

export const mockApprovals = [
  { id: "REQ-881", purpose: "Vendor Settlement Q3", amount: 450000, required: 3, signed: 2, status: "Pending" },
  { id: "REQ-882", purpose: "Marketing Bonus Pool", amount: 25000, required: 2, signed: 0, status: "Pending" },
];
