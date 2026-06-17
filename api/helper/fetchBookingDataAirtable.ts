import { fetchServicesMap } from "./fetchServicesID";

const BASE_URL = process.env.EXPO_PUBLIC_AIRTABLE_API_URL_BOOKING;
const TOKEN = process.env.EXPO_PUBLIC_AIRTABLE_TOKEN;

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "";

  const t = Date.parse(dateString);
  if (isNaN(t)) return "";

  const d = new Date(t);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const year = d.getFullYear();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });

  return `${day} ${month} ${year}, ${weekday}`;
};

// Older Airtable records were saved before "NPR" was added to the budget
// options, so normalize the legacy values for display.
const formatBudget = (budget?: string | null) => {
  if (!budget) return "";
  return budget.includes("NPR") ? budget : budget.replace(/(\d)/, "NPR $1");
};

export const fetchBookingsFromAirtable = async () => {
  try {
    // 🚀 don't block booking fetch
    const servicesMapPromise = fetchServicesMap();

    const response = await fetch(BASE_URL!, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.log("Airtable Error:", data);
      return [];
    }

    // 🚀 wait only when needed
    const servicesMap = await servicesMapPromise;

    const records = data.records;

    const result = new Array(records.length);

    for (let i = 0; i < records.length; i++) {
      const item = records[i];
      const f = item.fields;

      const services =
        f["Select Services"]
          ?.map((id: string) => servicesMap[id])
          .filter(Boolean)
          .join(", ") || "";

      result[i] = {
        id: item.id,
        bookingId: f["bookingId"],

        fullName: f["Full name"],
        email: f["eMail"],
        phone: f["Phone"],

        city: f["City"],
        area: f["Area"],
        street: f["Street"],
        zip: f["Zip"],
        landmark: f["Nearest Landmark"],
        propertyType: f["Property Type"],

        service: services,

        bookingDate: formatDate(f["Service Booking Date & Time *"]),
        startingDate: formatDate(f["Starting Date"]),
        completionDate: formatDate(f["Service Completion Date"]),
        deadline: formatDate(f["Deadline"]),

        shift: f["Select Shift"],
        priority: f["Priority"],

        source: f["How did you know about us?"],
        workForce: f["workForce"],

        status: f["Status"],
        budget: formatBudget(f["Budget"]),
        specialRequests: f["Work Description"],
      };
    }

    return result;
  } catch (error) {
    console.log("Fetch Error:", error);
    return [];
  }
};