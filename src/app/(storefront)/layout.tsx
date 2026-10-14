import { Header } from "@/components/store/header";
import { MobileNav } from "@/components/store/mobile-nav";
import { CartDrawer } from "@/components/store/cart-drawer";
import { SearchOverlay } from "@/components/store/search-overlay";
import { AnnouncementBar } from "@/components/store/announcement-bar";
import { Newsletter } from "@/components/store/newsletter";
import { Footer } from "@/components/store/footer";
import { StoreProvider } from "@/components/store/store-provider";
import { getCurrentUser } from "@/lib/auth";
import { getCartDto, getWishlistDto } from "@/lib/cart";

// Storefront group layout — the shopper chrome composition point (ADR-008:
// chrome lives HERE so the chrome-less (auth) group never renders it).
//
// Server truth is fetched once per request and handed to the single
// StoreProvider as initial props; client mutations re-sync from their own
// action responses, and router.refresh() delivers fresh props through the
// adjust-state-during-render path in the provider.
export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const [cart, wishlist] = await Promise.all([
    getCartDto(user?.id ?? null),
    getWishlistDto(user?.id ?? null),
  ]);

  return (
    <StoreProvider
      initialCart={cart}
      initialUser={user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null}
      initialWishlist={[...wishlist.productIds]}
    >
      {/* Chrome order mirrors the reference: announcement strip, sticky
          header, overlay layers (nav drawer, bag drawer, search), page,
          newsletter band, footer. */}
      <AnnouncementBar />
      <Header />
      <MobileNav />
      <CartDrawer />
      <SearchOverlay />
      <main className="min-h-[60vh]">{children}</main>
      <Newsletter />
      <Footer />
    </StoreProvider>
  );
}
