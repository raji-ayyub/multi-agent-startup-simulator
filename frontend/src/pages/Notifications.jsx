import { useEffect } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import useNotificationStore from "../store/notificationStore";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { items, unreadCount, isLoading, fetchNotifications, markOneRead, markEverythingRead } = useNotificationStore();

  useEffect(() => {
    fetchNotifications({ limit: 50 });
  }, [fetchNotifications]);

  const handleOpen = async (item) => {
    if (!item.is_read) {
      await markOneRead(item.notification_id);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const handleReadAll = async () => {
    const ok = await markEverythingRead();
    if (!ok) {
      toast.error("Unable to mark notifications as read.");
    }
  };

  return (
    <section className="app-view h-full">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
        <header className="app-banner rounded-2xl border px-6 py-5">
          <p className="app-badge inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
            Role-Based Inbox
          </p>
          <h1 className="app-heading mt-3 text-4xl font-semibold">Notifications</h1>
          <p className="app-copy mt-2 max-w-3xl text-sm">
            Governance updates, report readiness, simulation completions, and management events are routed here by role and ownership.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-[0.34fr_1fr]">
          <article className="app-card rounded-2xl border p-5">
            <div className="flex items-center gap-3">
              <div className="app-icon-chip flex h-11 w-11 items-center justify-center rounded-full border">
                <Bell size={18} />
              </div>
              <div>
                <p className="app-muted text-xs uppercase tracking-[0.16em]">Unread</p>
                <p className="app-heading text-3xl font-semibold">{unreadCount}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReadAll}
              className="app-primary-btn mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              <CheckCheck size={15} />
              Mark All Read
            </button>
          </article>

          <article className="app-card rounded-2xl border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="app-heading text-lg font-semibold">Recent Activity</h2>
              <button
                type="button"
                onClick={() => fetchNotifications({ limit: 50 })}
                className="app-ghost-btn rounded-full border px-3 py-1 text-xs font-semibold"
              >
                Refresh
              </button>
            </div>
            {isLoading ? <p className="app-muted text-sm">Loading notifications...</p> : null}
            {!isLoading && items.length === 0 ? (
              <p className="app-muted text-sm">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <article
                    key={item.notification_id}
                    className={`rounded-xl border p-4 transition ${item.is_read ? "app-card-subtle" : "app-badge"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="app-muted mt-1 text-[11px] uppercase tracking-[0.16em]">{item.category}</p>
                      </div>
                      <p className="app-muted text-xs">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                    <p className="app-copy mt-3 text-sm">{item.message}</p>
                    <div className="mt-4 flex gap-2">
                      {!item.is_read ? (
                        <button
                          type="button"
                          onClick={() => markOneRead(item.notification_id)}
                          className="app-ghost-btn rounded-lg border px-3 py-2 text-xs font-semibold"
                        >
                          Mark Read
                        </button>
                      ) : null}
                      {item.link ? (
                        <button
                          type="button"
                          onClick={() => handleOpen(item)}
                          className="app-primary-btn inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
                        >
                          <ExternalLink size={13} />
                          Open
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </section>
  );
}
