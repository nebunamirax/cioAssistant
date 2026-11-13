import next from "eslint-config-next/core-web-vitals";

const config = [
  ...next,
  { ignores: [".next/**", "next-env.d.ts", "dist/**"] },
  {
    // These existing forms synchronize server values after a navigation or refresh.
    files: [
      "components/actions/action-form.tsx",
      "components/actions/action-kanban-view.tsx",
      "components/budget/budget-item-form.tsx",
      "components/communications/communication-form.tsx",
      "components/contracts/contract-form.tsx",
      "components/emails/email-link-form.tsx",
      "components/emails/outlook-controls.tsx",
      "components/meetings/meeting-form.tsx",
      "components/projects/project-form.tsx",
      "components/vendors/vendor-form.tsx"
    ],
    rules: { "react-hooks/set-state-in-effect": "off" }
  }
];

export default config;
