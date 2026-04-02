"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSales = getSales;
exports.getSalesStats = getSalesStats;
exports.getSalesOutletOptions = getSalesOutletOptions;
exports.getSaleByOutletDate = getSaleByOutletDate;
exports.createSale = createSale;
exports.updateSale = updateSale;
exports.updateSaleBank = updateSaleBank;
exports.deleteSale = deleteSale;
const salesService_1 = require("../services/salesService");
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
function getUser(event) {
    const token = (0, jwt_1.extractBearerToken)(event.headers['Authorization'] || event.headers['authorization']);
    return (0, jwt_1.verifyToken)(token);
}
/** GET /api/sales */
async function getSales(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    try {
        const qs = event.queryStringParameters || {};
        const filters = {
            start_date: qs.start_date,
            end_date: qs.end_date,
            // Outlet users can only see their own data
            outlet: user.type === 'outlet' ? user.outlet : qs.outlet,
        };
        const sales = await (0, salesService_1.getAllOutletSales)(filters);
        return (0, response_1.ok)(sales, 'Outlet sales records retrieved successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** GET /api/sales/stats */
async function getSalesStats(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    try {
        const qs = event.queryStringParameters || {};
        const filters = {
            start_date: qs.start_date,
            end_date: qs.end_date,
            outlet: user.type === 'outlet' ? user.outlet : qs.outlet,
        };
        const stats = await (0, salesService_1.getOutletSalesStats)(filters);
        return (0, response_1.ok)(stats, 'Outlet sales statistics retrieved successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** GET /api/sales/options */
async function getSalesOutletOptions(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    try {
        const options = await (0, salesService_1.getOutletOptions)();
        return (0, response_1.ok)(options, 'Outlet options retrieved successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** GET /api/sales/{outlet}/{date} */
async function getSaleByOutletDate(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    const { outlet, date } = event.pathParameters || {};
    if (!outlet || !date)
        return (0, response_1.badRequest)('Outlet and date path parameters are required');
    // Outlet users can only access their own data
    if (user.type === 'outlet' && user.outlet !== outlet) {
        return (0, response_1.forbidden)('Access denied: You can only view your own outlet data');
    }
    try {
        const sale = await (0, salesService_1.getOutletSaleByOutletAndDate)(outlet, date);
        if (!sale)
            return (0, response_1.notFound)(`No sale record found for outlet ${outlet} on ${date}`);
        return (0, response_1.ok)(sale, 'Outlet sale record retrieved successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** POST /api/sales */
async function createSale(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    try {
        const body = JSON.parse(event.body || '{}');
        const { outlet, date, cash, qris, gojek, shopee, grab } = body;
        if (!outlet || !date)
            return (0, response_1.badRequest)('Outlet and date are required');
        if (cash === undefined && qris === undefined && gojek === undefined &&
            shopee === undefined && grab === undefined) {
            return (0, response_1.badRequest)('At least one sales value is required');
        }
        // Outlet users can only create for their outlet
        if (user.type === 'outlet' && user.outlet !== outlet) {
            return (0, response_1.forbidden)('Access denied: You can only create sales for your own outlet');
        }
        const sale = await (0, salesService_1.createOutletSale)({
            outlet,
            date,
            cash: cash ?? 0,
            qris: qris ?? 0,
            gojek: gojek ?? 0,
            shopee: shopee ?? 0,
            grab: grab ?? 0,
        });
        return (0, response_1.created)(sale, 'Outlet sale created successfully');
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return (0, response_1.badRequest)(err.message);
        }
        return (0, response_1.serverError)(err);
    }
}
/** PUT /api/sales/{outlet}/{date} */
async function updateSale(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    const { outlet, date } = event.pathParameters || {};
    if (!outlet || !date)
        return (0, response_1.badRequest)('Outlet and date path parameters are required');
    if (user.type === 'outlet' && user.outlet !== outlet) {
        return (0, response_1.forbidden)('Access denied: You can only update your own outlet data');
    }
    try {
        const body = JSON.parse(event.body || '{}');
        const updated = await (0, salesService_1.updateOutletSale)(outlet, date, body);
        if (!updated)
            return (0, response_1.notFound)(`Sale record not found for outlet ${outlet} on ${date}`);
        return (0, response_1.ok)(updated, 'Outlet sale updated successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** PUT /api/sales/{outlet}/{date}/bank  – admin-only bank transfer update */
async function updateSaleBank(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    if (user.type !== 'admin')
        return (0, response_1.forbidden)('Admin access required');
    const { outlet, date } = event.pathParameters || {};
    if (!outlet || !date)
        return (0, response_1.badRequest)('Outlet and date path parameters are required');
    try {
        const body = JSON.parse(event.body || '{}');
        const updated = await (0, salesService_1.updateBankTransfer)(outlet, date, {
            ...body,
            verifiedBy: user.username,
        });
        if (!updated)
            return (0, response_1.notFound)(`Sale record not found for outlet ${outlet} on ${date}`);
        return (0, response_1.ok)(updated, 'Bank transfer data updated successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** DELETE /api/sales/{outlet}/{date} */
async function deleteSale(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    if (user.type !== 'admin')
        return (0, response_1.forbidden)('Admin access required');
    const { outlet, date } = event.pathParameters || {};
    if (!outlet || !date)
        return (0, response_1.badRequest)('Outlet and date path parameters are required');
    try {
        await (0, salesService_1.deleteOutletSale)(outlet, date);
        return (0, response_1.ok)(null, 'Sale record deleted successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
//# sourceMappingURL=sales.js.map