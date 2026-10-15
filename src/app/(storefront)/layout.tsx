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
          newsletter band, footer.

          A-1 (session-11): the skip link is the FIRST chrome element — the
          first Tab stop for keyboard users — and is sr-only at rest (a 1×1
          clipped box, zero resting visual footprint), revealed on focus
          only. Parity law respected: the reference never exercises the
          focus layer, so the resting output is unchanged. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:z-[60] focus:bg-background focus:px-4 focus:py-2 focus:border focus:border-foreground focus:font-montserrat focus:text-[10px] focus:tracking-[0.25em] focus:uppercase focus:text-foreground"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <MobileNav />
      <CartDrawer />
      <SearchOverlay />
      {/* A-1 (session-11): fragment target — tabIndex=-1 makes <main>
          focusable so Enter on the skip link moves FOCUS here, not just
          scroll (WCAG 2.4.1). focus:outline-none keeps the jump silent. */}
      <main id="main-content" tabIndex={-1} className="min-h-[60vh] focus:outline-none">{children}</main>
      <Newsletter />
      <Footer />
    </StoreProvider>
  );
}
