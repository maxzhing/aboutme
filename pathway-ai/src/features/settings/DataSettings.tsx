import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Button, Card, Modal, Notice } from '@/components/ui/primitives';
import { SectionHeader, Stat } from '@/components/ui/shared';
import { downloadCSV, downloadJSON, printPDF } from '@/lib/export';
import { countLabel } from '@/lib/format';
import { formatDateTime } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';

/* Sections 45 and 61 — export, delete, and an honest account of where data lives. */

export function DataSettings() {
  const { state, user, deleteAccount, logOut, toast } = useAppStore();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const counts = [
    { label: 'Colleges', value: state.collegeList.length },
    { label: 'Activities', value: state.profile.activities.length },
    { label: 'Practice attempts', value: state.attempts.length },
    { label: 'Essays', value: state.essays.length },
    { label: 'Deadlines', value: state.deadlines.length },
    { label: 'Saved items', value: state.savedItems.length },
  ];

  function exportEverything() {
    downloadJSON('pathway-ai-export.json', {
      exportedAt: new Date().toISOString(),
      note: 'Complete export of your Pathway AI account. Catalog content (colleges, courses, questions) is demo data and is not included.',
      account: state,
    });
    toast('Full export downloaded.', 'ok');
  }

  function exportProfileCsv() {
    downloadCSV(
      'pathway-profile.csv',
      [
        { Field: 'Name', Value: state.profile.displayName },
        { Field: 'Grade', Value: state.profile.academics.grade },
        { Field: 'School', Value: state.profile.academics.school },
        { Field: 'State', Value: state.profile.academics.state },
        { Field: 'GPA', Value: state.profile.academics.gpa ?? '' },
        { Field: 'GPA scale', Value: state.profile.academics.gpaScale },
        { Field: 'Majors', Value: state.profile.majors.map((m) => `${m.majorId} (${m.confidence})`).join('; ') },
        { Field: 'Interests', Value: state.profile.interests.join('; ') },
        { Field: 'Careers', Value: state.profile.careers.join('; ') },
        { Field: 'Activities', Value: state.profile.activities.map((a) => a.name).join('; ') },
      ],
    );
    toast('Profile exported as CSV.', 'ok');
  }

  async function reallyDelete() {
    await deleteAccount();
    toast('Account deleted. Nothing is retained.', 'default');
    navigate('/');
  }

  return (
    <div className="col g-6">
      <Card pad="md">
        <SectionHeader title="Where your data lives" description="Plainly, because this matters." />
        <ul className="col g-2">
          {[
            'Everything is stored in your browser, on this device, using IndexedDB — nothing is sent to a server, because this build has no server.',
            'That means your data does not sync between devices, and clearing your browser data deletes it permanently. Export regularly.',
            'Your password is hashed with PBKDF2 before storage. It is never stored as text — but a local password is a convenience, not real security against someone with access to your device.',
            'Nothing here is sold, shared, or used to train anything. There is no analytics, no tracking and no third-party scripts.',
          ].map((s) => (
            <li key={s} className="row g-2 t-sm subtle">
              <Icon name="shield" size={13} className="mt-1 shrink-0 c-accent" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <Notice tone="warn" icon="alert" className="mt-4">
          Because there is no server, there is also no password recovery. If you forget it, the data on this device is not retrievable — which is
          exactly why the export below matters.
        </Notice>
      </Card>

      <Card pad="md">
        <SectionHeader title="What you have in here" />
        <div className="row g-5 wrap">
          {counts.map((c) => (
            <Stat key={c.label} label={c.label} value={String(c.value)} />
          ))}
        </div>
        {user ? (
          <p className="t-2xs faint mt-4">
            Account {user.email} · created {formatDateTime(user.createdAt)}
          </p>
        ) : null}
      </Card>

      <Card pad="md">
        <SectionHeader title="Export" description="Take everything with you, in a format you can actually read." />
        <div className="row g-2 wrap">
          <Button icon="download" onClick={exportEverything}>
            Everything (JSON)
          </Button>
          <Button variant="ghost" icon="download" onClick={exportProfileCsv}>
            Profile (CSV)
          </Button>
          <Button variant="ghost" icon="pen" onClick={printPDF}>
            Print this page
          </Button>
        </div>
        <p className="t-2xs faint mt-3">
          The JSON export is your complete account: profile, college list, activities, attempts, essays, deadlines and settings. It contains
          everything the app knows about you, in full, with nothing withheld.
        </p>
      </Card>

      <Card pad="md">
        <SectionHeader title="Sign out" description="Leaves your data on this device." />
        <Button
          variant="ghost"
          icon="logout"
          onClick={async () => {
            await logOut();
            navigate('/');
          }}
        >
          Sign out
        </Button>
      </Card>

      <Card pad="md" className="danger-card">
        <SectionHeader title="Delete everything" description="Permanent, immediate and complete. There is no soft delete and no retention period." />
        <p className="t-sm subtle">
          This removes your profile, your college list, every practice attempt, every essay draft and every setting from this device. It cannot be
          undone. Export first if there is anything you want to keep.
        </p>
        <Button variant="danger" icon="trash" className="mt-4" onClick={() => setConfirmOpen(true)}>
          Delete my account
        </Button>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmText('');
        }}
        title="Delete your account permanently"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmOpen(false);
                setConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" disabled={confirmText !== 'DELETE'} onClick={reallyDelete}>
              Delete everything
            </Button>
          </>
        }
      >
        <div className="col g-4">
          <Notice tone="danger" icon="alert">
            This deletes {countLabel(state.attempts.length, 'practice attempt')}, {countLabel(state.essays.length, 'essay draft')},{' '}
            {countLabel(state.collegeList.length, 'saved college')} and everything else. It cannot be undone.
          </Notice>
          <Button variant="ghost" icon="download" onClick={exportEverything}>
            Export everything first
          </Button>
          <label className="label" htmlFor="confirm-delete">
            Type DELETE to confirm
          </label>
          <input
            id="confirm-delete"
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
      </Modal>
    </div>
  );
}
