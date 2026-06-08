# Orum sample exports

Reference screenshots and sample data for the **Orum dialer import** feature on
the Pacing Calculator (see `lib/orum.ts`, `app/components/OrumImport.tsx`, and
`app/api/orum/extract/route.ts`).

| File | What it shows |
|------|---------------|
| `orum-dashboard.jpeg` | The Orum analytics dashboard with the per-rep metrics table. |
| `orum-download-menu.jpeg` | The download menu — "Download CSV (raw data)", "Download XLSX (raw data)", "Download PNG". |
| `orum-csv-export.jpeg` | The raw CSV contents (the schema the CSV parser targets). |
| `orum-png-export.jpeg` | The PNG export of the table — a fixture for the AI vision import path. |

## CSV schema (column order)

```
"Rep name","Dials","Dial to connect","Bridged to connect","Outbound connects",
"Connect to conversation","Conversations","Conversation to meeting","Meetings",
"Callbacks","Callback to connect","Callback connects","Dial time","Talk time",
"Pause Time","Session Time"
```

Sample row (also used as the parser's verification fixture):

```
"Josh Handy",1063,0.05456255879586078,0.35616438356164387,58,0.4696969696969697,31,0.1935483870967742,6,19,0.42105263157894735,8,10660,6545,29857,47062
```

Notes:
- Rate columns are **decimal fractions** (`0.0546` = 5.46%).
- Time columns are **seconds** (`10660` = 2h 57m 40s, `47062` ≈ 13h).
- Counts (Dials / Outbound connects / Conversations / Meetings / Callbacks) are integers.
- A single-rep export has the rep row plus an identical **Total** row; multi-rep
  exports have one row per rep plus a Total.

The core pacing funnel maps **Dials → Outbound connects → Conversations →
Meetings** onto the Historical `dials / connects / conversations / orumDemoSets`
fields. `orum-png-export.jpeg` was used to verify the vision path end-to-end —
it extracted `1063 / 58 / 31 / 6` correctly.
