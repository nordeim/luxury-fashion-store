// Session-46 dev-DB hygiene: clean the dev cart rows the shots script left
// (the documented ritual) and re-verify the canonical 4/12/2/4 counts.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({ datasources: { db: { url: "file:" + process.cwd() + "/db/custom.db" } } });

(async () => {
  const cartItems = await p.cartItem.count();
  if (cartItems > 0) {
    await p.cartItem.deleteMany({});
    console.log("cleaned", cartItems, "dev cart rows");
  } else {
    console.log("dev cart already clean");
  }
  const [cat, prod, usr, ord] = await Promise.all([
    p.category.count(),
    p.product.count(),
    p.user.count(),
    p.order.count(),
  ]);
  console.log("canonical:", `${cat}/${prod}/${usr}/${ord}`);
  await p.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
