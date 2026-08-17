/**
 * Demo corpus: anonymised, synthetic e-commerce feedback.
 *
 * Three weekly batches rather than one, because the product's claim is trend
 * detection. Packaging complaints deliberately climb across the weeks (3 → 6 → 9)
 * so that loading them in order tells the story the board exists to tell:
 * a recurring defect becoming visible before it becomes a pattern.
 */

export type SampleBatch = {
  id: string
  label: string
  note: string
  items: string[]
}

const WEEK_1: string[] = [
  `The package was completely soaked and the cardboard box was crushed flat on the left corner. The bottle inside was leaking all over.`,
  `Courier marked this as delivered at 2 PM but nothing was at my doorstep. It finally arrived four days later with no notification.`,
  `I received 2 vanilla pods instead of the hazelnut butter jar I paid for. Order #88392.`,
  `Delivery was quick and the product is exactly as described. Very happy with this purchase.`,
  `The moisturiser has a weird rancid smell and caused immediate redness on my cheeks. Batch lot #A402.`,
  `Requested a return more than two weeks ago and the pickup has been rescheduled three times. Nobody has come to collect it.`,
  `Fantastic quality for the price. The fabric feels much more premium than I expected.`,
  `Support has not replied to my email in six days. I have followed up twice and still nothing.`,
  `Box arrived with the tape hanging off and the contents rattling around loose inside.`,
  `App crashed twice while I was trying to check out. Had to restart my phone and rebuild the whole cart.`,
  `Charged twice for the same order. One transaction shows as pending and the other has already been debited.`,
  `Order arrived on time and well within the promised window. No complaints at all.`,
  `The zip on the jacket broke the second time I wore it. For this price I expected far better.`,
  `Prices have gone up quite a bit since last month. The same item was noticeably cheaper when I ordered in June.`,
  `Wrong colour sent — I ordered navy and received black. The promised free gift was also missing from the parcel.`,
  `Tracking has not updated since Tuesday and the estimated date has now passed twice.`,
  `Really impressed with how fast this shipped. Ordered Monday night, arrived Tuesday morning.`,
  `Outer carton was fine but there was no bubble wrap inside at all, so the jar was rolling around freely.`,
  `Checkout kept rejecting my card even though my bank confirmed there was no block on it.`,
  `The size guide is wrong. I ordered a large based on the chart and it fits like a small.`,
]

const WEEK_2: string[] = [
  `Second delivery in a row where the box arrived crushed. The corner was caved in and one item was dented.`,
  `Packaging is getting worse. The carton was already split open when the courier handed it to me.`,
  `My parcel was left in the rain and the box disintegrated. Everything inside is water damaged.`,
  `Two of the four glasses arrived broken. There was a single sheet of paper between them, nothing else.`,
  `The tape had completely come away and the box was open when it reached me. Nothing appeared to be missing but it felt unsafe.`,
  `Ordered a set of ceramic mugs and two of them arrived cracked. The outer box was crushed on one side.`,
  `Still waiting for my order. It was supposed to arrive four days ago and tracking has not moved.`,
  `Courier attempted delivery once, marked me as unavailable, and I was at home the whole day.`,
  `Item stopped working after about a week. The charging port is loose and it no longer holds a charge.`,
  `Received a completely different product to what I ordered. The invoice matches my order but the parcel does not.`,
  `Refund was approved eleven days ago and the money still has not reached my account.`,
  `Great product, arrived earlier than promised. Will order again.`,
  `Nobody on the support chat has been able to tell me where my replacement is. Third conversation this week.`,
  `The website kept timing out during payment and I ended up placing the order three times by accident.`,
  `Discount code from your own newsletter would not apply at checkout. Paid full price in the end.`,
  `Quality of the packaging has really dropped compared to my earlier orders. It used to be excellent.`,
  `Very happy with the fit and the material. Exactly as pictured.`,
  `The lid was not sealed properly and half the contents had spilled inside the bag.`,
  `Delivery driver threw the parcel over the gate. I watched him do it on the camera.`,
  `Charged shipping despite the order being over the free delivery threshold.`,
  `Perfect. No issues at all, and the packaging was recyclable which I appreciated.`,
]

const WEEK_3: string[] = [
  `Third order in a row arriving in a crushed box. At this point I assume it is how you pack them, not the courier.`,
  `Box was completely flattened on one side and the product inside was visibly bent.`,
  `Packaging failed again — no internal protection whatsoever, just the item loose in an oversized carton.`,
  `The carton arrived soaked through and falling apart. The label was unreadable.`,
  `Both bottles leaked because they were not sealed or wrapped. The whole box was sticky.`,
  `Item arrived shattered. The box had a large hole in it and there was no padding inside.`,
  `Same packaging problem as my last two orders. Crushed corner, damaged product, another refund request.`,
  `Received the parcel open with the tape torn. I have no way of knowing whether anything was taken.`,
  `Glass jar arrived in pieces. Wrapped in a single thin sheet, which is not adequate for glass.`,
  `Order is now six days late and tracking still shows it at the same sorting facility.`,
  `Courier claims delivery was attempted but there is no card and no notification.`,
  `The colour is nothing like the photos on the site. Far duller in person.`,
  `Support closed my ticket without resolving it and told me to open a new one.`,
  `Return pickup has failed twice now. I have taken two days off work for this.`,
  `Refund still not processed after two weeks. Nobody can give me a date.`,
  `Fast delivery and the product is great. No complaints from me.`,
  `Payment page froze and then charged me twice for the same basket.`,
  `Price of this item has increased three times since March. Getting hard to justify.`,
  `Sent a medium instead of the large that is clearly on my invoice. Please advise on the exchange.`,
  `Genuinely good product and it arrived quickly. The packaging was the only weak point — quite flimsy.`,
  `Lovely quality, arrived on time, would recommend.`,
  `The box was crushed but thankfully the contents survived this time. Still, it does not inspire confidence.`,
]

function toText(items: string[]): string {
  return items.join('\n\n')
}

export const SAMPLE_BATCHES: SampleBatch[] = [
  {
    id: 'week-1',
    label: 'Week 1',
    note: 'Baseline week — complaints spread across themes',
    items: WEEK_1,
  },
  {
    id: 'week-2',
    label: 'Week 2',
    note: 'Packaging complaints begin to cluster',
    items: WEEK_2,
  },
  {
    id: 'week-3',
    label: 'Week 3',
    note: 'Packaging is now the dominant driver',
    items: WEEK_3,
  },
]

export function batchText(batch: SampleBatch): string {
  return toText(batch.items)
}
