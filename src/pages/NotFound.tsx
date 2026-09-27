import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Drishti3DIcon } from "@/components/Drishti3DIcon";
import { AppIcon } from "@/components/AppIcon";

/**
 * The 404, inside the app shell.
 *
 * Previously the scaffold's default: raw `text-4xl font-bold` and a bare
 * anchor that reloaded the whole app to get home. The mark is the radar
 * sweeping an empty field — the route was searched for and is not there. It
 * is the only illustration on the page, so it gets hero size and loads first.
 * The way out is a Link, so the router, the session and every cached query
 * survive the trip back.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="flex max-w-md flex-col items-center text-center">
        <Drishti3DIcon name="notFound" size="hero" priority />
        <h1 className="mt-6 font-display text-display-xl text-primary">Page not found</h1>
        <p className="mt-2 text-body-md text-tertiary">
          Nothing is mapped to{" "}
          <code className="rounded-md bg-action px-1.5 py-0.5 text-body-sm text-secondary">{location.pathname}</code>
          . It may have moved, or the link may be out of date.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-9 items-center gap-1.5 rounded-full bg-action-primary px-4 text-label-sm text-on-color outline-none transition-colors hover:bg-action-primary-hover focus-visible:ring-2 focus-visible:ring-active"
        >
          <AppIcon name="arrowLeft" size="sm" />
          Back to the overview
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
