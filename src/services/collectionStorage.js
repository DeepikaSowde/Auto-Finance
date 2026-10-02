// src/services/collectionStorage.js

// Collections are stored and posted server-side. Recording one runs the
// payment-allocation waterfall against the loan's installments inside a
// database transaction (see backend/src/services/collectionRepository.js),
// so this module is a thin client plus the reporting/aggregation helpers
// the collection pages render. There is no approval step: a recorded
// collection is already posted (status "Approved", shown as "Posted").

import { apiGet, apiPost, notifyDataUpdated } from "./api";

/* =========================================================
   COLLECTION STATUS
========================================================= */

export const COLLECTION_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVERSED: "Reversed",
};

/* =========================================================
   PAYMENT TYPE
========================================================= */

export const COLLECTION_PAYMENT_TYPE = {
  DUE: "Due Payment",
  OVERDUE: "Overdue Payment",
  ADVANCE: "Advance Payment",
  DUE_ADVANCE: "Due + Advance",
  OVERDUE_ADVANCE:
    "Overdue + Advance",
  OVERDUE_DUE_ADVANCE:
    "Overdue + Due + Advance",
  FULL_SETTLEMENT: "Full Settlement",
  PRINCIPAL: "Principal Payment",
  PENALTY: "Penalty Payment",
  EXCESS: "Excess Payment",
};

/* =========================================================
   STORAGE READ
========================================================= */

export const getCollections = async () => {
  try {
    const collections = await apiGet("/collections");

    return Array.isArray(collections) ? collections : [];
  } catch (error) {
    console.error("Failed to read collections:", error);

    return [];
  }
};

/* =========================================================
   NORMALIZE
========================================================= */

const normalize = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
};

/* =========================================================
   NUMBER
========================================================= */

const toNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const roundMoney = (
  value
) => {
  return (
    Math.round(
      (
        toNumber(value) +
        Number.EPSILON
      ) * 100
    ) / 100
  );
};

/* =========================================================
   DATE HELPERS
========================================================= */

export const getDateKey = (
  value
) => {
  if (!value) {
    return "";
  }

  const raw =
    String(value);

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
};

/* =========================================================
   DATE PARSE
========================================================= */

const parseLocalDate = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date
  ) {
    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const raw =
    String(value);

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};

/* =========================================================
   DATE RANGE NORMALIZATION
========================================================= */

const startOfDay = (
  value
) => {
  const date =
    parseLocalDate(value);

  if (!date) {
    return null;
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const endOfDay = (
  value
) => {
  const date =
    parseLocalDate(value);

  if (!date) {
    return null;
  }

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
};

/* =========================================================
   CREATE COLLECTION
========================================================= */

/* =========================================================
   CREATE COLLECTION

   The server validates the loan, posts the payment to the
   loan's installments and assigns the collection id. Send a
   clientRef (one per payment attempt) so a repeated request
   returns the first collection instead of posting twice.
========================================================= */

export const addCollection = async (collection = {}) => {
  const saved = await apiPost("/collections", collection);

  notifyDataUpdated();

  return saved;
};

/* =========================================================
   READ ONE
========================================================= */

export const getCollectionById = async (collectionId) => {
  try {
    return await apiGet(`/collections/${collectionId}`);
  } catch (error) {
    console.error("Failed to load collection:", error);

    return null;
  }
};

/* =========================================================
   APPROVE

   Only for collections still Pending from before payments
   posted automatically. The server runs the allocation
   waterfall (penalty -> interest -> principal ->
   advance/excess), posts it against the loan's installments
   and records the payment history in a single transaction,
   so a collection can never post twice.
========================================================= */

export const approveCollection = async (collectionId) => {
  try {
    const result = await apiPost(`/collections/${collectionId}/approve`);

    notifyDataUpdated();

    return {
      success: true,
      collection: result.collection,
      loan: result.loan,
      allocation: result.allocation,
    };
  } catch (error) {
    console.error("Failed to approve collection:", error);

    return { success: false, message: error?.message || "Unable to approve this collection." };
  }
};

/* =========================================================
   REJECT
========================================================= */

export const rejectCollection = async (collectionId, remarks = "") => {
  try {
    const collection = await apiPost(`/collections/${collectionId}/reject`, { remarks });

    notifyDataUpdated();

    return { success: true, collection };
  } catch (error) {
    console.error("Failed to reject collection:", error);

    return { success: false, message: error?.message || "Unable to reject this collection." };
  }
};

/* =========================================================
   REVERSE

   Unwinds an approved collection: its postings are removed
   and the affected installments are recomputed.
========================================================= */

export const reverseCollection = async (collectionId, reason = "") => {
  try {
    const collection = await apiPost(`/collections/${collectionId}/reverse`, { reason });

    notifyDataUpdated();

    return { success: true, collection };
  } catch (error) {
    console.error("Failed to reverse collection:", error);

    return { success: false, message: error?.message || "Unable to reverse this collection." };
  }
};

/* =========================================================
   PENDING
========================================================= */

export const getPendingCollections =
  async () => {
    return (await getCollections()).filter(
      (item) =>
        normalize(
          item?.status
        ) ===
        "pending"
    );
  };

/* =========================================================
   APPROVED
========================================================= */

export const getApprovedCollections =
  async () => {
    return (await getCollections()).filter(
      (item) =>
        normalize(
          item?.status
        ) ===
        "approved"
    );
  };

/* =========================================================
   REJECTED
========================================================= */

export const getRejectedCollections =
  async () => {
    return (await getCollections()).filter(
      (item) =>
        normalize(
          item?.status
        ) ===
        "rejected"
    );
  };

/* =========================================================
   REVERSED
========================================================= */

export const getReversedCollections =
  async () => {
    return (await getCollections()).filter(
      (item) =>
        normalize(
          item?.status
        ) ===
        "reversed"
    );
  };

/* =========================================================
   APPROVED TOTAL
========================================================= */

export const getApprovedCollectionTotal =
  async () => {
    return (await getCollections())
      .filter(
        (item) =>
          normalize(
            item?.status
          ) ===
          "approved"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amount
          ),
        0
      );
  };

/* =========================================================
   PENDING TOTAL
========================================================= */

export const getPendingCollectionTotal =
  async () => {
    return (await getCollections())
      .filter(
        (item) =>
          normalize(
            item?.status
          ) ===
          "pending"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amount
          ),
        0
      );
  };

/* =========================================================
   REJECTED TOTAL
========================================================= */

export const getRejectedCollectionTotal =
  async () => {
    return (await getCollections())
      .filter(
        (item) =>
          normalize(
            item?.status
          ) ===
          "rejected"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amount
          ),
        0
      );
  };

/* =========================================================
   TODAY APPROVED TOTAL
========================================================= */

export const getTodayApprovedCollectionTotal =
  async () => {
    const today =
      getDateKey(
        new Date()
      );

    return (await getCollections())
      .filter(
        (item) => {
          if (
            normalize(
              item?.status
            ) !==
            "approved"
          ) {
            return false;
          }

          return (
            getDateKey(
              item?.approvedAt ||
                item?.collectedDate
            ) ===
            today
          );
        }
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amount
          ),
        0
      );
  };

/* =========================================================
   COLLECTIONS FOR LOAN
========================================================= */

export const getCollectionsForLoan =
  async (
    loanId,
    loanNumber
  ) => {
    return (await getCollections()).filter(
      (item) => {
        const matchesId =
          Boolean(
            loanId
          ) &&
          String(
            item?.loanId ||
              ""
          ) ===
            String(
              loanId
            );

        const matchesNumber =
          Boolean(
            loanNumber
          ) &&
          String(
            item?.loanNumber ||
              ""
          ) ===
            String(
              loanNumber
            );

        return (
          matchesId ||
          matchesNumber
        );
      }
    );
  };

/* =========================================================
   COLLECTIONS FOR CUSTOMER
========================================================= */

export const getCollectionsForCustomer =
  async (
    customerId
  ) => {
    return (await getCollections()).filter(
      (item) =>
        String(
          item?.customerId ||
            ""
        ) ===
        String(
          customerId ||
            ""
        )
    );
  };

/* =========================================================
   STATUS COUNTS
========================================================= */

export const getCollectionStatusCounts =
  async () => {
    const collections =
      await getCollections();

    return {
      total:
        collections.length,

      pending:
        collections.filter(
          (item) =>
            normalize(
              item?.status
            ) ===
            "pending"
        ).length,

      approved:
        collections.filter(
          (item) =>
            normalize(
              item?.status
            ) ===
            "approved"
        ).length,

      rejected:
        collections.filter(
          (item) =>
            normalize(
              item?.status
            ) ===
            "rejected"
        ).length,

      reversed:
        collections.filter(
          (item) =>
            normalize(
              item?.status
            ) ===
            "reversed"
        ).length,
    };
  };

/* =========================================================
   COLLECTION AMOUNT
========================================================= */

export const getCollectionAmount = (
  collection
) => {
  return roundMoney(
    collection?.amount
  );
};

/* =========================================================
   COLLECTION PENALTY
========================================================= */

export const getCollectionPenalty =
  (
    collection
  ) => {
    return roundMoney(
      collection?.penaltyAmount
    );
  };

/* =========================================================
   VALIDATE COLLECTION
========================================================= */

export const validateCollection = (
  collection
) => {
  if (!collection) {
    return {
      valid: false,
      reason:
        "collection_required",
    };
  }

  const amount =
    getCollectionAmount(
      collection
    );

  if (
    amount <= 0
  ) {
    return {
      valid: false,
      reason:
        "invalid_payment_amount",
    };
  }

  if (
    !collection?.loanId &&
    !collection?.loanNumber
  ) {
    return {
      valid: false,
      reason:
        "loan_identifier_required",
    };
  }

  return {
    valid: true,
    reason: "",
  };
};

/* =========================================================
   HISTORICAL COLLECTION REPORT DATE
========================================================= */

/*
 * Date used for historical reporting.
 *
 * Priority:
 *
 * 1. collectedDate
 * 2. approvedAt
 * 3. submittedAt
 * 4. createdAt
 */

export const getCollectionReportDate = (
  collection
) => {
  return (
    collection?.collectedDate ||
    collection?.approvedAt ||
    collection?.submittedAt ||
    collection?.createdAt ||
    ""
  );
};

/* =========================================================
   COLLECTION DATE RANGE MATCH
========================================================= */

const collectionMatchesDateRange = (
  collection,
  startDate,
  endDate
) => {
  const reportDate =
    parseLocalDate(
      getCollectionReportDate(
        collection
      )
    );

  if (!reportDate) {
    return false;
  }

  const start =
    startDate
      ? startOfDay(
          startDate
        )
      : null;

  const end =
    endDate
      ? endOfDay(
          endDate
        )
      : null;

  if (
    start &&
    reportDate.getTime() <
      start.getTime()
  ) {
    return false;
  }

  if (
    end &&
    reportDate.getTime() >
      end.getTime()
  ) {
    return false;
  }

  return true;
};

/* =========================================================
   COLLECTION HISTORY
========================================================= */

/*
 * Returns historical collection
 * records without modifying storage.
 *
 * Supported filters:
 *
 * startDate
 * endDate
 * status
 * customerId
 * loanId
 * loanNumber
 * search
 * approvedOnly
 */

export const getCollectionHistory = async ({
  startDate = "",
  endDate = "",
  status = "",
  customerId = "",
  loanId = "",
  loanNumber = "",
  search = "",
  customerName = "",
  approvedOnly = false,
} = {}) => {
  const collections =
    await getCollections();

  const query =
    normalize(
      search ||
        customerName
    );

  return collections
    .filter(
      (collection) => {
        /*
         * DATE RANGE
         */
        if (
          startDate ||
          endDate
        ) {
          if (
            !collectionMatchesDateRange(
              collection,
              startDate,
              endDate
            )
          ) {
            return false;
          }
        }

        /*
         * STATUS
         */
        if (
          status &&
          normalize(
            collection?.status
          ) !==
            normalize(
              status
            )
        ) {
          return false;
        }

        /*
         * APPROVED ONLY
         */
        if (
          approvedOnly &&
          normalize(
            collection?.status
          ) !==
            "approved"
        ) {
          return false;
        }

        /*
         * CUSTOMER ID
         */
        if (
          customerId &&
          String(
            collection?.customerId ||
              ""
          ) !==
            String(
              customerId
            )
        ) {
          return false;
        }

        /*
         * LOAN ID
         */
        if (
          loanId &&
          String(
            collection?.loanId ||
              ""
          ) !==
            String(
              loanId
            )
        ) {
          return false;
        }

        /*
         * LOAN NUMBER
         */
        if (
          loanNumber &&
          normalize(
            collection?.loanNumber
          ) !==
            normalize(
              loanNumber
            )
        ) {
          return false;
        }

        /*
         * GENERIC SEARCH
         */
        if (query) {
          const searchableText = [
            collection?.id,
            collection?.customerName,
            collection?.customerId,
            collection?.mobileNumber,
            collection?.loanNumber,
            collection?.loanId,
            collection?.paymentType,
            collection?.paymentMode,
            collection?.staffName,
            collection?.location,
            collection?.remarks,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (
            !searchableText.includes(
              query
            )
          ) {
            return false;
          }
        }

        return true;
      }
    )
    .sort(
      (
        a,
        b
      ) => {
        const aDate =
          parseLocalDate(
            getCollectionReportDate(
              a
            )
          );

        const bDate =
          parseLocalDate(
            getCollectionReportDate(
              b
            )
          );

        return (
          (
            bDate?.getTime() ||
            0
          ) -
          (
            aDate?.getTime() ||
            0
          )
        );
      }
    );
};

/* =========================================================
   COLLECTION HISTORY BY DATE RANGE
========================================================= */

export const getCollectionHistoryByDateRange =
  async (
    startDate,
    endDate,
    options = {}
  ) => {
    return getCollectionHistory({
      ...options,
      startDate,
      endDate,
    });
  };

/* =========================================================
   COLLECTION HISTORY SUMMARY
========================================================= */

export const getCollectionHistorySummary =
  async ({
    startDate = "",
    endDate = "",
    status = "",
    customerId = "",
    loanId = "",
    loanNumber = "",
    search = "",
    customerName = "",
    approvedOnly = false,
  } = {}) => {
    const records =
      await getCollectionHistory({
        startDate,
        endDate,
        status,
        customerId,
        loanId,
        loanNumber,
        search,
        customerName,
        approvedOnly,
      });

    const totalAmount =
      records.reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amount
          ),
        0
      );

    const approvedRecords =
      records.filter(
        (item) =>
          normalize(
            item?.status
          ) ===
          "approved"
      );

    const pendingRecords =
      records.filter(
        (item) =>
          normalize(
            item?.status
          ) ===
          "pending"
      );

    const rejectedRecords =
      records.filter(
        (item) =>
          normalize(
            item?.status
          ) ===
          "rejected"
      );

    const reversedRecords =
      records.filter(
        (item) =>
          normalize(
            item?.status
          ) ===
          "reversed"
      );

    const approvedAmount =
      approvedRecords.reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amount
          ),
        0
      );

    const pendingAmount =
      pendingRecords.reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amount
          ),
        0
      );

    const rejectedAmount =
      rejectedRecords.reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amount
          ),
        0
      );

    const reversedAmount =
      reversedRecords.reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amount
          ),
        0
      );

    const totalPenalty =
      records.reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.penaltyAmount
          ),
        0
      );

    /*
     * Total due component.
     *
     * Prefer the actual allocation's
     * overdue + currentDue values.
     * Fall back to amountTowardDue.
     */
    const totalDue =
      records.reduce(
        (
          total,
          item
        ) => {
          const allocation =
            item?.allocation ||
            {};

          const allocatedDue =
            toNumber(
              allocation?.overdue
            ) +
            toNumber(
              allocation?.currentDue
            );

          return (
            total +
            (
              allocatedDue > 0
                ? allocatedDue
                : toNumber(
                    item?.amountTowardDue
                  )
            )
          );
        },
        0
      );

    const totalAdvance =
      records.reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amountTowardAdvance
          ),
        0
      );

    const totalPrincipal =
      records.reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amountTowardPrincipal
          ),
        0
      );

    const totalExcess =
      records.reduce(
        (
          total,
          item
        ) =>
          total +
          toNumber(
            item?.amountExcess
          ),
        0
      );

    /*
     * Customer-wise totals.
     */
    const byCustomerMap =
      new Map();

    records.forEach(
      (item) => {
        const customerId =
          String(
            item?.customerId ||
              "NO-ID"
          );

        const customerName =
          item?.customerName ||
          "Customer";

        const key =
          `${customerId}__${customerName}`;

        const existing =
          byCustomerMap.get(
            key
          ) || {
            customerId:
              item?.customerId ||
              "",

            customerName:
              customerName,

            amount:
              0,

            count:
              0,
          };

        existing.amount +=
          toNumber(
            item?.amount
          );

        existing.count += 1;

        byCustomerMap.set(
          key,
          existing
        );
      }
    );

    const uniqueCustomers =
      new Set(
        records
          .map(
            (item) =>
              item?.customerId
          )
          .filter(Boolean)
      );

    /*
     * Customer ID may not always exist.
     * Use a customer+loan fallback
     * for unique reporting.
     */
    const customerCount =
      uniqueCustomers.size ||
      new Set(
        records.map(
          (item) =>
            item?.customerName ||
            ""
        )
      ).size;

    const uniqueLoans =
      new Set(
        records
          .map(
            (item) =>
              item?.loanId ||
              item?.loanNumber
          )
          .filter(Boolean)
      );

    const averageCollection =
      records.length >
      0
        ? totalAmount /
          records.length
        : 0;

    return {
      startDate,
      endDate,

      recordCount:
        records.length,

      /*
       * Compatibility alias used
       * by some existing UI code.
       */
      totalRecords:
        records.length,

      totalAmount:
        roundMoney(
          totalAmount
        ),

      approvedCount:
        approvedRecords.length,

      approvedAmount:
        roundMoney(
          approvedAmount
        ),

      pendingCount:
        pendingRecords.length,

      pendingAmount:
        roundMoney(
          pendingAmount
        ),

      rejectedCount:
        rejectedRecords.length,

      rejectedAmount:
        roundMoney(
          rejectedAmount
        ),

      reversedCount:
        reversedRecords.length,

      reversedAmount:
        roundMoney(
          reversedAmount
        ),

      totalPenalty:
        roundMoney(
          totalPenalty
        ),

      totalDue:
        roundMoney(
          totalDue
        ),

      totalAdvance:
        roundMoney(
          totalAdvance
        ),

      totalPrincipal:
        roundMoney(
          totalPrincipal
        ),

      totalExcess:
        roundMoney(
          totalExcess
        ),

      customerCount,

      loanCount:
        uniqueLoans.size,

      averageCollection:
        roundMoney(
          averageCollection
        ),

      /*
       * Customer-wise reporting.
       */
      byCustomer:
        Array.from(
          byCustomerMap.values()
        ).sort(
          (a, b) =>
            b.amount -
            a.amount
        ),

      records,
    };
  };

/* =========================================================
   MONTHLY COLLECTION SUMMARY
========================================================= */

/*
 * Returns totals grouped by month.
 *
 * Example:
 *
 * [
 *   {
 *     month: "2026-09",
 *     total: 50000,
 *     count: 12
 *   }
 * ]
 */

export const getMonthlyCollectionSummary =
  async ({
    status = "Approved",
    year = null,
  } = {}) => {
    const collections =
      await getCollections();

    const grouped =
      {};

    collections.forEach(
      (collection) => {
        if (
          status &&
          normalize(
            collection?.status
          ) !==
            normalize(
              status
            )
        ) {
          return;
        }

        const reportDate =
          parseLocalDate(
            getCollectionReportDate(
              collection
            )
          );

        if (!reportDate) {
          return;
        }

        const reportYear =
          reportDate.getFullYear();

        if (
          year !== null &&
          year !== undefined &&
          Number(year) !==
            reportYear
        ) {
          return;
        }

        const monthKey =
          `${reportYear}-${String(
            reportDate.getMonth() + 1
          ).padStart(
            2,
            "0"
          )}`;

        if (
          !grouped[
            monthKey
          ]
        ) {
          grouped[
            monthKey
          ] = {
            month:
              monthKey,

            total:
              0,

            count:
              0,

            penalty:
              0,

            due:
              0,

            advance:
              0,

            principal:
              0,

            excess:
              0,
          };
        }

        grouped[
          monthKey
        ].total +=
          toNumber(
            collection?.amount
          );

        grouped[
          monthKey
        ].count +=
          1;

        grouped[
          monthKey
        ].penalty +=
          toNumber(
            collection?.amountTowardPenalty
          );

        /*
         * Prefer allocation overdue +
         * currentDue when available.
         */
        const allocation =
          collection?.allocation ||
          {};

        const allocationDue =
          toNumber(
            allocation?.overdue
          ) +
          toNumber(
            allocation?.currentDue
          );

        grouped[
          monthKey
        ].due +=
          allocationDue > 0
            ? allocationDue
            : toNumber(
                collection?.amountTowardDue
              );

        grouped[
          monthKey
        ].advance +=
          toNumber(
            collection?.amountTowardAdvance
          );

        grouped[
          monthKey
        ].principal +=
          toNumber(
            collection?.amountTowardPrincipal
          );

        grouped[
          monthKey
        ].excess +=
          toNumber(
            collection?.amountExcess
          );
      }
    );

    return Object.values(
      grouped
    )
      .map(
        (item) => ({
          ...item,

          total:
            roundMoney(
              item.total
            ),

          penalty:
            roundMoney(
              item.penalty
            ),

          due:
            roundMoney(
              item.due
            ),

          advance:
            roundMoney(
              item.advance
            ),

          principal:
            roundMoney(
              item.principal
            ),

          excess:
            roundMoney(
              item.excess
            ),
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.month.localeCompare(
            a.month
          )
      );
  };

/* =========================================================
   LIFETIME COLLECTION SUMMARY
========================================================= */

export const getLifetimeCollectionSummary =
  () => {
    return getCollectionHistorySummary(
      {
        status:
          COLLECTION_STATUS.APPROVED,
      }
    );
  };

/* =========================================================
   THIS MONTH COLLECTION SUMMARY
========================================================= */

export const getThisMonthCollectionSummary =
  () => {
    const today =
      new Date();

    const firstDay =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    const lastDay =
      new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      );

    return getCollectionHistorySummary({
      startDate:
        getDateKey(
          firstDay
        ),

      endDate:
        getDateKey(
          lastDay
        ),

      status:
        COLLECTION_STATUS.APPROVED,
    });
  };

/* =========================================================
   YESTERDAY COLLECTION SUMMARY
========================================================= */

export const getYesterdayCollectionSummary =
  () => {
    const today =
      new Date();

    today.setDate(
      today.getDate() - 1
    );

    const date =
      getDateKey(
        today
      );

    return getCollectionHistorySummary({
      startDate:
        date,

      endDate:
        date,

      status:
        COLLECTION_STATUS.APPROVED,
    });
  };

/* =========================================================
   TODAY COLLECTION SUMMARY
========================================================= */

export const getTodayCollectionSummary =
  () => {
    const today =
      getDateKey(
        new Date()
      );

    return getCollectionHistorySummary({
      startDate:
        today,

      endDate:
        today,

      status:
        COLLECTION_STATUS.APPROVED,
    });
  };

/* =========================================================
   LEGACY COMPATIBILITY
========================================================= */

export const getApprovedCollectionAmount =
  getApprovedCollectionTotal;

export const getPendingCollectionAmount =
  getPendingCollectionTotal;

export const getCollectionByLoanId = (
  loanId
) => {
  return getCollectionsForLoan(
    loanId,
    ""
  );
};

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  COLLECTION_STATUS,
  COLLECTION_PAYMENT_TYPE,

  getCollections,
  addCollection,

  getCollectionById,

  approveCollection,
  rejectCollection,
  reverseCollection,

  getPendingCollections,
  getApprovedCollections,
  getRejectedCollections,
  getReversedCollections,

  getApprovedCollectionTotal,
  getPendingCollectionTotal,
  getRejectedCollectionTotal,
  getTodayApprovedCollectionTotal,

  getCollectionsForLoan,
  getCollectionsForCustomer,

  getCollectionStatusCounts,

  getCollectionAmount,
  getCollectionPenalty,

  validateCollection,

  getApprovedCollectionAmount,
  getPendingCollectionAmount,
  getCollectionByLoanId,

  getDateKey,

  getCollectionReportDate,
  getCollectionHistory,
  getCollectionHistoryByDateRange,
  getCollectionHistorySummary,
  getMonthlyCollectionSummary,
  getLifetimeCollectionSummary,
  getThisMonthCollectionSummary,
  getYesterdayCollectionSummary,
  getTodayCollectionSummary,
};