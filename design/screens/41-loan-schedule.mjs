import * as C from '../kit/components.mjs';

const { screen, vstack, hstack, box, text, divider } = C;

export const section = 'Loans';
export const order = 41;

/*
 * src/app/loan-schedule.tsx — every payment, grouped by year.
 *
 * All 60 rows are drawn rather than a sample, because the point of the screen
 * is watching the bar flip over the term. Every figure is the app's own
 * `amortise()` output for $25,000 at 6.5% over 60 months, funded 17 Aug 2026,
 * first payment 17 Sep 2026, on actual/365 — payment $489.22, final $489.42,
 * interest $4,353.40.
 */

export const YEARS = [{"year":"2026","caption":"$531.68 interest · $1,425.20 off","rows":[{"head":"1. 17 Sep 2026","pay":"$489.22","p":351.21,"i":138.01,"split":"$351.21 off · $138.01 interest · 31d","left":"$24,648.79 left"},{"head":"2. 17 Oct 2026","pay":"$489.22","p":357.53,"i":131.69,"split":"$357.53 off · $131.69 interest · 30d","left":"$24,291.26 left"},{"head":"3. 17 Nov 2026","pay":"$489.22","p":355.12,"i":134.1,"split":"$355.12 off · $134.10 interest · 31d","left":"$23,936.14 left"},{"head":"4. 17 Dec 2026","pay":"$489.22","p":361.34,"i":127.88,"split":"$361.34 off · $127.88 interest · 30d","left":"$23,574.80 left"}]},{"year":"2027","caption":"$1,400.53 interest · $4,470.11 off","rows":[{"head":"5. 17 Jan 2027","pay":"$489.22","p":359.07,"i":130.15,"split":"$359.07 off · $130.15 interest · 31d","left":"$23,215.73 left"},{"head":"6. 17 Feb 2027","pay":"$489.22","p":361.06,"i":128.16,"split":"$361.06 off · $128.16 interest · 31d","left":"$22,854.67 left"},{"head":"7. 17 Mar 2027","pay":"$489.22","p":375.26,"i":113.96,"split":"$375.26 off · $113.96 interest · 28d","left":"$22,479.41 left"},{"head":"8. 17 Apr 2027","pay":"$489.22","p":365.12,"i":124.1,"split":"$365.12 off · $124.10 interest · 31d","left":"$22,114.29 left"},{"head":"9. 17 May 2027","pay":"$489.22","p":371.08,"i":118.14,"split":"$371.08 off · $118.14 interest · 30d","left":"$21,743.21 left"},{"head":"10. 17 Jun 2027","pay":"$489.22","p":369.19,"i":120.03,"split":"$369.19 off · $120.03 interest · 31d","left":"$21,374.02 left"},{"head":"11. 17 Jul 2027","pay":"$489.22","p":375.03,"i":114.19,"split":"$375.03 off · $114.19 interest · 30d","left":"$20,998.99 left"},{"head":"12. 17 Aug 2027","pay":"$489.22","p":373.29,"i":115.93,"split":"$373.29 off · $115.93 interest · 31d","left":"$20,625.70 left"},{"head":"13. 17 Sep 2027","pay":"$489.22","p":375.35,"i":113.87,"split":"$375.35 off · $113.87 interest · 31d","left":"$20,250.35 left"},{"head":"14. 17 Oct 2027","pay":"$489.22","p":381.03,"i":108.19,"split":"$381.03 off · $108.19 interest · 30d","left":"$19,869.32 left"},{"head":"15. 17 Nov 2027","pay":"$489.22","p":379.53,"i":109.69,"split":"$379.53 off · $109.69 interest · 31d","left":"$19,489.79 left"},{"head":"16. 17 Dec 2027","pay":"$489.22","p":385.1,"i":104.12,"split":"$385.10 off · $104.12 interest · 30d","left":"$19,104.69 left"}]},{"year":"2028","caption":"$1,104.58 interest · $4,766.06 off","rows":[{"head":"17. 17 Jan 2028","pay":"$489.22","p":383.75,"i":105.47,"split":"$383.75 off · $105.47 interest · 31d","left":"$18,720.94 left"},{"head":"18. 17 Feb 2028","pay":"$489.22","p":385.87,"i":103.35,"split":"$385.87 off · $103.35 interest · 31d","left":"$18,335.07 left"},{"head":"19. 17 Mar 2028","pay":"$489.22","p":394.53,"i":94.69,"split":"$394.53 off · $94.69 interest · 29d","left":"$17,940.54 left"},{"head":"20. 17 Apr 2028","pay":"$489.22","p":390.18,"i":99.04,"split":"$390.18 off · $99.04 interest · 31d","left":"$17,550.36 left"},{"head":"21. 17 May 2028","pay":"$489.22","p":395.46,"i":93.76,"split":"$395.46 off · $93.76 interest · 30d","left":"$17,154.90 left"},{"head":"22. 17 Jun 2028","pay":"$489.22","p":394.52,"i":94.7,"split":"$394.52 off · $94.70 interest · 31d","left":"$16,760.38 left"},{"head":"23. 17 Jul 2028","pay":"$489.22","p":399.68,"i":89.54,"split":"$399.68 off · $89.54 interest · 30d","left":"$16,360.70 left"},{"head":"24. 17 Aug 2028","pay":"$489.22","p":398.9,"i":90.32,"split":"$398.90 off · $90.32 interest · 31d","left":"$15,961.80 left"},{"head":"25. 17 Sep 2028","pay":"$489.22","p":401.1,"i":88.12,"split":"$401.10 off · $88.12 interest · 31d","left":"$15,560.70 left"},{"head":"26. 17 Oct 2028","pay":"$489.22","p":406.09,"i":83.13,"split":"$406.09 off · $83.13 interest · 30d","left":"$15,154.61 left"},{"head":"27. 17 Nov 2028","pay":"$489.22","p":405.56,"i":83.66,"split":"$405.56 off · $83.66 interest · 31d","left":"$14,749.05 left"},{"head":"28. 17 Dec 2028","pay":"$489.22","p":410.42,"i":78.8,"split":"$410.42 off · $78.80 interest · 30d","left":"$14,338.63 left"}]},{"year":"2029","caption":"$781.97 interest · $5,088.67 off","rows":[{"head":"29. 17 Jan 2029","pay":"$489.22","p":410.06,"i":79.16,"split":"$410.06 off · $79.16 interest · 31d","left":"$13,928.57 left"},{"head":"30. 17 Feb 2029","pay":"$489.22","p":412.33,"i":76.89,"split":"$412.33 off · $76.89 interest · 31d","left":"$13,516.24 left"},{"head":"31. 17 Mar 2029","pay":"$489.22","p":421.82,"i":67.4,"split":"$421.82 off · $67.40 interest · 28d","left":"$13,094.42 left"},{"head":"32. 17 Apr 2029","pay":"$489.22","p":416.93,"i":72.29,"split":"$416.93 off · $72.29 interest · 31d","left":"$12,677.49 left"},{"head":"33. 17 May 2029","pay":"$489.22","p":421.49,"i":67.73,"split":"$421.49 off · $67.73 interest · 30d","left":"$12,256.00 left"},{"head":"34. 17 Jun 2029","pay":"$489.22","p":421.56,"i":67.66,"split":"$421.56 off · $67.66 interest · 31d","left":"$11,834.44 left"},{"head":"35. 17 Jul 2029","pay":"$489.22","p":425.99,"i":63.23,"split":"$425.99 off · $63.23 interest · 30d","left":"$11,408.45 left"},{"head":"36. 17 Aug 2029","pay":"$489.22","p":426.24,"i":62.98,"split":"$426.24 off · $62.98 interest · 31d","left":"$10,982.21 left"},{"head":"37. 17 Sep 2029","pay":"$489.22","p":428.59,"i":60.63,"split":"$428.59 off · $60.63 interest · 31d","left":"$10,553.62 left"},{"head":"38. 17 Oct 2029","pay":"$489.22","p":432.84,"i":56.38,"split":"$432.84 off · $56.38 interest · 30d","left":"$10,120.78 left"},{"head":"39. 17 Nov 2029","pay":"$489.22","p":433.35,"i":55.87,"split":"$433.35 off · $55.87 interest · 31d","left":"$9,687.43 left"},{"head":"40. 17 Dec 2029","pay":"$489.22","p":437.47,"i":51.75,"split":"$437.47 off · $51.75 interest · 30d","left":"$9,249.96 left"}]},{"year":"2030","caption":"$441.16 interest · $5,429.48 off","rows":[{"head":"41. 17 Jan 2030","pay":"$489.22","p":438.16,"i":51.06,"split":"$438.16 off · $51.06 interest · 31d","left":"$8,811.80 left"},{"head":"42. 17 Feb 2030","pay":"$489.22","p":440.57,"i":48.65,"split":"$440.57 off · $48.65 interest · 31d","left":"$8,371.23 left"},{"head":"43. 17 Mar 2030","pay":"$489.22","p":447.48,"i":41.74,"split":"$447.48 off · $41.74 interest · 28d","left":"$7,923.75 left"},{"head":"44. 17 Apr 2030","pay":"$489.22","p":445.48,"i":43.74,"split":"$445.48 off · $43.74 interest · 31d","left":"$7,478.27 left"},{"head":"45. 17 May 2030","pay":"$489.22","p":449.27,"i":39.95,"split":"$449.27 off · $39.95 interest · 30d","left":"$7,029.00 left"},{"head":"46. 17 Jun 2030","pay":"$489.22","p":450.42,"i":38.8,"split":"$450.42 off · $38.80 interest · 31d","left":"$6,578.58 left"},{"head":"47. 17 Jul 2030","pay":"$489.22","p":454.07,"i":35.15,"split":"$454.07 off · $35.15 interest · 30d","left":"$6,124.51 left"},{"head":"48. 17 Aug 2030","pay":"$489.22","p":455.41,"i":33.81,"split":"$455.41 off · $33.81 interest · 31d","left":"$5,669.10 left"},{"head":"49. 17 Sep 2030","pay":"$489.22","p":457.92,"i":31.3,"split":"$457.92 off · $31.30 interest · 31d","left":"$5,211.18 left"},{"head":"50. 17 Oct 2030","pay":"$489.22","p":461.38,"i":27.84,"split":"$461.38 off · $27.84 interest · 30d","left":"$4,749.80 left"},{"head":"51. 17 Nov 2030","pay":"$489.22","p":463,"i":26.22,"split":"$463.00 off · $26.22 interest · 31d","left":"$4,286.80 left"},{"head":"52. 17 Dec 2030","pay":"$489.22","p":466.32,"i":22.9,"split":"$466.32 off · $22.90 interest · 30d","left":"$3,820.48 left"}]},{"year":"2031","caption":"$93.48 interest · $3,820.48 off","rows":[{"head":"53. 17 Jan 2031","pay":"$489.22","p":468.13,"i":21.09,"split":"$468.13 off · $21.09 interest · 31d","left":"$3,352.35 left"},{"head":"54. 17 Feb 2031","pay":"$489.22","p":470.71,"i":18.51,"split":"$470.71 off · $18.51 interest · 31d","left":"$2,881.64 left"},{"head":"55. 17 Mar 2031","pay":"$489.22","p":474.85,"i":14.37,"split":"$474.85 off · $14.37 interest · 28d","left":"$2,406.79 left"},{"head":"56. 17 Apr 2031","pay":"$489.22","p":475.93,"i":13.29,"split":"$475.93 off · $13.29 interest · 31d","left":"$1,930.86 left"},{"head":"57. 17 May 2031","pay":"$489.22","p":478.9,"i":10.32,"split":"$478.90 off · $10.32 interest · 30d","left":"$1,451.96 left"},{"head":"58. 17 Jun 2031","pay":"$489.22","p":481.2,"i":8.02,"split":"$481.20 off · $8.02 interest · 31d","left":"$970.76 left"},{"head":"59. 17 Jul 2031","pay":"$489.22","p":484.03,"i":5.19,"split":"$484.03 off · $5.19 interest · 30d","left":"$486.73 left"},{"head":"60. 17 Aug 2031","pay":"$489.42","p":486.73,"i":2.69,"split":"$486.73 off · $2.69 interest · 31d","left":"$0.00 left"}]}];
export const YEARS_EXTRA = [{"year":"2026","caption":"$526.79 interest · $2,030.09 off","rows":[{"head":"1. 17 Sep 2026","pay":"$639.22","p":501.21,"i":138.01,"split":"$501.21 off · $138.01 interest · $150.00 extra","left":"$24,498.79 left"},{"head":"2. 17 Oct 2026","pay":"$639.22","p":508.34,"i":130.88,"split":"$508.34 off · $130.88 interest · $150.00 extra","left":"$23,990.45 left"},{"head":"3. 17 Nov 2026","pay":"$639.22","p":506.78,"i":132.44,"split":"$506.78 off · $132.44 interest · $150.00 extra","left":"$23,483.67 left"},{"head":"4. 17 Dec 2026","pay":"$639.22","p":513.76,"i":125.46,"split":"$513.76 off · $125.46 interest · $150.00 extra","left":"$22,969.91 left"}]},{"year":"2027","caption":"$1,272.77 interest · $8,397.87 off","rows":[{"head":"5. 17 Jan 2027","pay":"$639.22","p":512.41,"i":126.81,"split":"$512.41 off · $126.81 interest · $150.00 extra","left":"$22,457.50 left"},{"head":"6. 17 Feb 2027","pay":"$639.22","p":515.24,"i":123.98,"split":"$515.24 off · $123.98 interest · $150.00 extra","left":"$21,942.26 left"},{"head":"7. 17 Mar 2027","pay":"$639.22","p":529.81,"i":109.41,"split":"$529.81 off · $109.41 interest · $150.00 extra","left":"$21,412.45 left"},{"head":"8. 17 Apr 2027","pay":"$639.22","p":521.01,"i":118.21,"split":"$521.01 off · $118.21 interest · $150.00 extra","left":"$20,891.44 left"},{"head":"9. 17 May 2027","pay":"$639.22","p":527.61,"i":111.61,"split":"$527.61 off · $111.61 interest · $150.00 extra","left":"$20,363.83 left"},{"head":"10. 17 Jun 2027","pay":"$639.22","p":526.8,"i":112.42,"split":"$526.80 off · $112.42 interest · $150.00 extra","left":"$19,837.03 left"},{"head":"11. 17 Jul 2027","pay":"$639.22","p":533.24,"i":105.98,"split":"$533.24 off · $105.98 interest · $150.00 extra","left":"$19,303.79 left"},{"head":"12. 17 Aug 2027","pay":"$639.22","p":532.65,"i":106.57,"split":"$532.65 off · $106.57 interest · $150.00 extra","left":"$18,771.14 left"},{"head":"13. 17 Sep 2027","pay":"$2,639.22","p":2535.59,"i":103.63,"split":"$2,535.59 off · $103.63 interest · $2,150.00 extra","left":"$16,235.55 left"},{"head":"14. 17 Oct 2027","pay":"$639.22","p":552.48,"i":86.74,"split":"$552.48 off · $86.74 interest · $150.00 extra","left":"$15,683.07 left"},{"head":"15. 17 Nov 2027","pay":"$639.22","p":552.64,"i":86.58,"split":"$552.64 off · $86.58 interest · $150.00 extra","left":"$15,130.43 left"},{"head":"16. 17 Dec 2027","pay":"$639.22","p":558.39,"i":80.83,"split":"$558.39 off · $80.83 interest · $150.00 extra","left":"$14,572.04 left"}]},{"year":"2028","caption":"$745.43 interest · $6,925.21 off","rows":[{"head":"17. 17 Jan 2028","pay":"$639.22","p":558.77,"i":80.45,"split":"$558.77 off · $80.45 interest · $150.00 extra","left":"$14,013.27 left"},{"head":"18. 17 Feb 2028","pay":"$639.22","p":561.86,"i":77.36,"split":"$561.86 off · $77.36 interest · $150.00 extra","left":"$13,451.41 left"},{"head":"19. 17 Mar 2028","pay":"$639.22","p":569.75,"i":69.47,"split":"$569.75 off · $69.47 interest · $150.00 extra","left":"$12,881.66 left"},{"head":"20. 17 Apr 2028","pay":"$639.22","p":568.11,"i":71.11,"split":"$568.11 off · $71.11 interest · $150.00 extra","left":"$12,313.55 left"},{"head":"21. 17 May 2028","pay":"$639.22","p":573.44,"i":65.78,"split":"$573.44 off · $65.78 interest · $150.00 extra","left":"$11,740.11 left"},{"head":"22. 17 Jun 2028","pay":"$639.22","p":574.41,"i":64.81,"split":"$574.41 off · $64.81 interest · $150.00 extra","left":"$11,165.70 left"},{"head":"23. 17 Jul 2028","pay":"$639.22","p":579.57,"i":59.65,"split":"$579.57 off · $59.65 interest · $150.00 extra","left":"$10,586.13 left"},{"head":"24. 17 Aug 2028","pay":"$639.22","p":580.78,"i":58.44,"split":"$580.78 off · $58.44 interest · $150.00 extra","left":"$10,005.35 left"},{"head":"25. 17 Sep 2028","pay":"$639.22","p":583.98,"i":55.24,"split":"$583.98 off · $55.24 interest · $150.00 extra","left":"$9,421.37 left"},{"head":"26. 17 Oct 2028","pay":"$639.22","p":588.89,"i":50.33,"split":"$588.89 off · $50.33 interest · $150.00 extra","left":"$8,832.48 left"},{"head":"27. 17 Nov 2028","pay":"$639.22","p":590.46,"i":48.76,"split":"$590.46 off · $48.76 interest · $150.00 extra","left":"$8,242.02 left"},{"head":"28. 17 Dec 2028","pay":"$639.22","p":595.19,"i":44.03,"split":"$595.19 off · $44.03 interest · $150.00 extra","left":"$7,646.83 left"}]},{"year":"2029","caption":"$279.12 interest · $7,391.52 off","rows":[{"head":"29. 17 Jan 2029","pay":"$639.22","p":597.01,"i":42.21,"split":"$597.01 off · $42.21 interest · $150.00 extra","left":"$7,049.82 left"},{"head":"30. 17 Feb 2029","pay":"$639.22","p":600.3,"i":38.92,"split":"$600.30 off · $38.92 interest · $150.00 extra","left":"$6,449.52 left"},{"head":"31. 17 Mar 2029","pay":"$639.22","p":607.06,"i":32.16,"split":"$607.06 off · $32.16 interest · $150.00 extra","left":"$5,842.46 left"},{"head":"32. 17 Apr 2029","pay":"$639.22","p":606.97,"i":32.25,"split":"$606.97 off · $32.25 interest · $150.00 extra","left":"$5,235.49 left"},{"head":"33. 17 May 2029","pay":"$639.22","p":611.25,"i":27.97,"split":"$611.25 off · $27.97 interest · $150.00 extra","left":"$4,624.24 left"},{"head":"34. 17 Jun 2029","pay":"$639.22","p":613.69,"i":25.53,"split":"$613.69 off · $25.53 interest · $150.00 extra","left":"$4,010.55 left"},{"head":"35. 17 Jul 2029","pay":"$639.22","p":617.79,"i":21.43,"split":"$617.79 off · $21.43 interest · $150.00 extra","left":"$3,392.76 left"},{"head":"36. 17 Aug 2029","pay":"$639.22","p":620.49,"i":18.73,"split":"$620.49 off · $18.73 interest · $150.00 extra","left":"$2,772.27 left"},{"head":"37. 17 Sep 2029","pay":"$639.22","p":623.92,"i":15.3,"split":"$623.92 off · $15.30 interest · $150.00 extra","left":"$2,148.35 left"},{"head":"38. 17 Oct 2029","pay":"$639.22","p":627.74,"i":11.48,"split":"$627.74 off · $11.48 interest · $150.00 extra","left":"$1,520.61 left"},{"head":"39. 17 Nov 2029","pay":"$639.22","p":630.83,"i":8.39,"split":"$630.83 off · $8.39 interest · $150.00 extra","left":"$889.78 left"},{"head":"40. 17 Dec 2029","pay":"$639.22","p":634.47,"i":4.75,"split":"$634.47 off · $4.75 interest · $150.00 extra","left":"$255.31 left"}]},{"year":"2030","caption":"$1.41 interest · $255.31 off","rows":[{"head":"41. 17 Jan 2030","pay":"$256.72","p":255.31,"i":1.41,"split":"$255.31 off · $1.41 interest · 31d","left":"$0.00 left"}]}];

const FOOTNOTE_BASE =
  'Interest accrues daily on what is still owed, so a 31-day month costs more than a 28-day one.';

/** loan-schedule.tsx's own <PaymentRow>. */
const PaymentRow = (row) =>
  vstack({ pad: { y: 12 }, name: 'PaymentRow' }, [
    hstack({ justify: 'between', gap: 12, align: 'baseline' }, [
      text(row.head, { size: 14, weight: 500, lineHeight: 20, color: 'ink' }, { flex: 1, nowrap: true }),
      text(row.pay, { size: 14, weight: 600, lineHeight: 20, color: 'ink' }, { nowrap: true }),
    ]),
    hstack({ h: 8, radius: 'full', fill: 'ink/5', clip: true, mt: 8 }, [
      box({ flex: Math.max(row.p, 0.0001), fill: 'body', self: 'stretch' }),
      box({ flex: Math.max(row.i, 0.0001), fill: 'accent', self: 'stretch' }),
    ]),
    hstack({ justify: 'between', gap: 12, mt: 6 }, [
      // No numberOfLines on this one in the source, so it wraps rather than
      // ellipsising once an overpayment is named in it.
      text(row.split, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { flex: 1 }),
      text(row.left, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { nowrap: true }),
    ]),
  ]);

/** The year heading: its own element, because the total has to be able to wrap. */
const YearHeading = (year) => [
  hstack({ mt: 32, justify: 'between', gap: 12, align: 'baseline' }, [
    text(year.year, { size: 17, weight: 600, lineHeight: 24, color: 'ink' }, { nowrap: true }),
    text(year.caption, { size: 12, weight: 400, lineHeight: 17, color: 'muted' }, { nowrap: true }),
  ]),
  divider({ color: 'line', mt: 4 }),
  ...year.rows.map(PaymentRow),
];

const page = ({ title, subtitle, interest, years, footnote }) => [
  C.Title(title),
  C.Subtitle(subtitle, { mt: 12 }),
  box({ mt: 24, radius: 16, stroke: 'line', fill: 'card', pad: 16 }, C.ProportionBar(25000, interest)),
  ...years.flatMap(YearHeading),
  text(footnote, { size: 12, weight: 400, lineHeight: 18, color: 'muted', align: 'center' }, { mt: 32, mb: 40 }),
];

export default [
  screen({
    id: 'loan-schedule',
    name: 'Payment schedule',
    back: true,
    children: page({
      title: 'Payment schedule',
      subtitle: `$489.22 a month for 5 yrs, at 6.5%. ${FOOTNOTE_BASE}`,
      interest: 4353.4,
      years: YEARS,
      footnote: `${FOOTNOTE_BASE} Assumes every payment lands on time and the rate never moves — paying late costs the extra days. Paying extra against the balance shortens the term.`,
    }),
  }),
  screen({
    id: 'loan-schedule-overpaid',
    name: 'Payment schedule / with overpayments',
    back: true,
    children: page({
      title: 'Payment schedule',
      subtitle: `$489.22 a month for 3 yrs 5 mo, at 6.5%. ${FOOTNOTE_BASE}`,
      interest: 2825.52,
      years: YEARS_EXTRA,
      footnote: `${FOOTNOTE_BASE} Assumes every payment lands on time and the rate never moves — paying late costs the extra days. The overpayments you set are already in these rows, which is why the schedule ends early.`,
    }),
  }),
  screen({
    id: 'loan-schedule-saved',
    name: 'Payment schedule / a saved loan',
    back: true,
    children: page({
      // A loan opened from Bills passes its name, so the title is the loan's.
      title: 'Car loan',
      subtitle: `$489.22 a month for 5 yrs, at 6.5%. ${FOOTNOTE_BASE}`,
      interest: 4353.4,
      years: YEARS,
      footnote: `${FOOTNOTE_BASE} Assumes every payment lands on time and the rate never moves — paying late costs the extra days. Paying extra against the balance shortens the term.`,
    }),
  }),
];
