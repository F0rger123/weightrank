import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { rankFor } from "@/domain/rating";
import {
  Account, claimFriendCode, cloudConfigured, Friend, goOnline, Invite, pullProfile, pushProfile, watchAccount,
  watchFriends, watchInvites,
} from "@/lib/cloud";
import { Profile, useProfile } from "./profile";

type Ctx = {
  /** Cloud is set up in this build. */
  enabled: boolean;
  account: Account | null;
  friendCode: string;
  friends: Friend[];
  invites: Invite[];
  sync: "off" | "syncing" | "saved" | "error";
};

const AccountContext = createContext<Ctx>({ enabled: false, account: null, friendCode: "", friends: [], invites: [], sync: "off" });

/** Keeps the signed-in account, friends, invites and cloud progress in step with the phone. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { profile, ready, replace, patch } = useProfile();
  const [account, setAccount] = useState<Account | null>(null);
  const [friendCode, setFriendCode] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [sync, setSync] = useState<Ctx["sync"]>("off");
  const pulled = useRef<string | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => watchAccount(setAccount), []);

  // Friends, invites, presence, friend code for the current account.
  useEffect(() => {
    if (!account) return;
    const offs = [watchFriends(account.uid, setFriends), watchInvites(account.uid, setInvites), goOnline(account.uid)];
    claimFriendCode(account.uid).then(setFriendCode).catch(() => {});
    return () => offs.forEach((f) => f());
  }, [account?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // On sign-in: bring down saved progress. Switching to a different account
  // always takes that account's progress; same account takes whichever is newer.
  useEffect(() => {
    if (!account || !ready || pulled.current === account.uid) return;
    pulled.current = account.uid;
    setSync("syncing");
    pullProfile(account.uid)
      .then((remote) => {
        const local = profileRef.current;
        if (remote) {
          const r = JSON.parse(remote.json) as Profile;
          const otherAccount = local.syncedUid && local.syncedUid !== account.uid;
          const remoteNewer = remote.updatedAt > (local.updatedAt ?? 0);
          if ((otherAccount || remoteNewer || !local.onboarded) && r.onboarded) {
            replace({ ...r, syncedUid: account.uid, updatedAt: remote.updatedAt });
            setSync("saved");
            return;
          }
        }
        patch({ syncedUid: account.uid });
      })
      .catch(() => setSync("error"));
  }, [account?.uid, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push changes a few seconds after they happen.
  useEffect(() => {
    if (!account || pulled.current !== account.uid || !profile.onboarded) return;
    const t = setTimeout(() => {
      setSync("syncing");
      const p = { ...profile, sessions: profile.sessions.slice(-400) };
      pushProfile(account.uid, JSON.stringify(p), {
        name: profile.name,
        rating: profile.rating,
        rank: rankFor(profile.rating).name,
        code: friendCode,
      })
        .then(() => setSync("saved"))
        .catch(() => setSync("error"));
    }, 2500);
    return () => clearTimeout(t);
  }, [profile.updatedAt, account?.uid, friendCode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AccountContext.Provider value={{ enabled: cloudConfigured, account, friendCode, friends, invites, sync }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccount = () => useContext(AccountContext);
