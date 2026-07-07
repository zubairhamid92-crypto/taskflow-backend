import Joi from "joi";

// Define user validation schema
const merchantAccountValidate = Joi.object({
  businessSectorId: Joi.number().integer().positive().required(),
  uniqueKey: Joi.string().valid("freelancer", "private-sector").required(),
  freelancerNumber: Joi.string()
    .pattern(/^FL-\d{9}$/) // ✅ Must start with FL- and exactly 9 digits after
    .when("businessSectorId", {
      is: 1000004,
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "string.pattern.base":
        "Freelancer number must start with 'FL-' and be followed by exactly 9 digits.",
    }),
  unNumber: Joi.string()
    .pattern(/^7[A-Za-z0-9]{9}$/) // must start with 7 + total 10 chars
    .when("businessSectorId", {
      is: 1000003,
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "string.pattern.base":
        "UN number must start with 7 and be exactly 10 characters long (letters and numbers only).",
      "string.empty": "CR number is required.",
    }),

  taxNumber: Joi.string()
    .allow("") // allow empty initially
    .pattern(/^3\d{13}3$/) // 👈 starts with 3, 13 digits in the middle, ends with 3 (total 15)
    .when("businessSectorId", {
      is: Joi.valid(1000003),
      then: Joi.required().disallow(""), // required & not empty
      otherwise: Joi.when("businessSectorId", {
        is: Joi.valid(1000004),
        then: Joi.optional(),
        otherwise: Joi.optional(),
      }),
    })
    .messages({
      "string.pattern.base":
        "Tax number must be 15 digits, start with 3, and end with 3.",
    }),
}).unknown(true);

const reverifyAccounttValidate = Joi.object({
  businessSectorId: Joi.number().integer().positive().required(),
  uniqueKey: Joi.string().required(),
}).unknown(true);

const verifyOwnerShipValidate = Joi.object({
  businessAccountId: Joi.number().integer().positive().required(),
  nafathNumber: Joi.number().integer().positive().required(),
}).unknown(true);

const bankDetailValidate = Joi.object({
  businessAccountId: Joi.number().integer().positive().required(),
  ibanNumber: Joi.string()
    .length(24) // ✅ Must be exactly 24 characters
    .pattern(/^SA[A-Za-z0-9]+$/) // ✅ Must start with SA and contain only letters and digits
    .required()
    .messages({
      "string.length": "IBAN number must be exactly 24 characters long.",
      "string.pattern.base":
        "IBAN number must start with 'SA' and contain only letters and numbers (no spaces or special characters).",
      "string.empty": "IBAN number is required.",
    }),
}).unknown(true);

const brandsValidate = Joi.object({
  businessAccountId: Joi.number().integer().positive().required(),
  businessCategoryId: Joi.number().integer().positive().required(),
  regionId: Joi.number().integer().positive().required(),
  trademarkName: Joi.string()
    .max(250)
     .pattern(/^[\u0600-\u06FFa-zA-Z0-9\s-]+$/) // ✅ only letters, numbers, spaces, and hyphens
    .required()
    .messages({
      "string.pattern.base":
        "Trademark name can only contain letters, numbers, spaces, and hyphens.",
      "string.empty": "Trademark name is required.",
    }),
}).unknown(true);

const contactValidate = Joi.object({
  businessAccountId: Joi.number().integer().positive().required(),
  fullName: Joi.string()
    .min(3)
    .max(50)
   .pattern(/^[A-Za-z\u0600-\u06FF\s]+$/) // ✅ Only alphabets and spaces
    .required()
    .messages({
      "string.pattern.base":
        "Full name must only contain alphabets and spaces.",
      "string.min": "Full name must be at least 3 characters long.",
      "string.max": "Full name must not exceed 50 characters.",
    }),

  emailAddress: Joi.string()
    .max(128)
    .pattern(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/) // ✅ Standard email pattern
    .pattern(/^\S+$/) // ✅ No spaces
    .required()
    .messages({
      "string.pattern.base":
        "Email must be valid and contain only letters, numbers, dots, and @ (no spaces or other special characters).",
      "string.empty": "Email address is required.",
    }),
  phoneNumber: Joi.string()
  .pattern(/^\d{10}$/) // Must be exactly 10 digits
  .custom((value, helpers) => {
    // Merge both arrays, filter out undefined/null
    const acceptableCodes = [
      ...(global?.config?.system?.acceptable_mobile_codes || []),
      ...(global?.config?.system?.acceptable_phone_codes || []),
    ];
 
    const startsWithValidCode = acceptableCodes.some((code) =>
      value.startsWith(code)
    );
 
    if (!startsWithValidCode) {
      return helpers.message(
        `Phone must start with one of: ${acceptableCodes.join(", ")}`
      );
    }
 
    return value; // valid
  })
  .required()
  .messages({
    "string.pattern.base": "Phone must contain exactly 10 digits",
    "string.empty": "Phone is required",
  }),
}).unknown(true);

const commonArraySchema = Joi.object({
  businessAccountId: Joi.number().integer().positive().required(), // Newly added field at the top level
  requestedQty: Joi.number().positive().required(), // Newly added field at the top level
  isSameLocation: Joi.boolean().required(), // Newly added field at the top level
  isSameIBAN: Joi.boolean().required(), // Newly added field at the top level
  packageId: Joi.number().integer().positive().required(),
  packages: Joi.object({
    id: Joi.number().integer().positive().required(),
    priceChannel: Joi.array()
      .items(
        Joi.object({
          id: Joi.number().integer().positive().required()
        })
      )
      .min(1)
      .required()
  }).required(),
  locations: Joi.array() // Nested array for locations
    .items(
      Joi.object({
        businessAccountId: Joi.number().integer().positive().required(),

        installedLocationCityId: Joi.string().required(),
        installedLocationDistrictId: Joi.string().optional(), // Optional field
        // pricechannelList: Joi.array().items(Joi.number().required()).required(),
        bankAccountIBANNumber: Joi.string()
          .length(24) // ✅ Must be exactly 24 characters
          .pattern(/^SA[A-Za-z0-9]+$/) // ✅ Must start with SA and contain only letters and digits
          .required()
          .messages({
            "string.length": "IBAN number must be exactly 24 characters long.",
            "string.pattern.base":
              "IBAN number must start with 'SA' and contain only letters and numbers (no spaces or special characters).",
            "string.empty": "IBAN number is required.",
          }),
      }).unknown(true) // Allow additional fields in each location object
    )
    .min(1) // Locations array must contain at least one item if provided
    .required(), // Locations array is required
}).unknown(true); // Allow additional fields at the top level

// Schema for the Electronic object
const electronicObjectSchema = Joi.object({
  businessAccountId: Joi.number().integer().positive().required(),
  businessSectorId: Joi.number().integer().positive().required(),
  packageId: Joi.number().integer().positive().required(),
  websiteUrl: Joi.string().optional(),
  pricechannelList: Joi.array().items(Joi.number().required()).required(),
})
  .unknown(true) // Allow additional fields
  .optional() // Electronic object itself is optional
  .not({}); // Prevent empty objects

// Main schema for service products
const serviceProductsValidate = Joi.object({
  POS: commonArraySchema, // Validate POS array
  Electronic: electronicObjectSchema, // Validate Electronic object
})
  .or("POS", "Electronic") // Ensure at least one is provided
  .messages({
    "object.missing": "At least one of POS or Electronic must be provided.",
    "object.with": "Electronic cannot be an empty object.",
  });

const disclosureValidate = Joi.object({
  businessAccountId: Joi.number().integer().positive().required(),
  monthlyTransactionCount: Joi.number().required(),
  monthlyTransactionVolume: Joi.number().required(),
  yearlySale: Joi.number().required(),
  isAnotherAccount: Joi.number().required(),
  isPolitician: Joi.number().required(),
}).unknown(true);

const termsConditionValidate = Joi.object({
  businessAccountId: Joi.number().integer().positive().required(),
}).unknown(true);

const getUnnNumberValidate = Joi.object({
  businessIdentifier: Joi.string()
  .pattern(/^[0-9]+$/)  // only digits
  .length(10)           // exactly 10 characters
  .required()
});

export {
  merchantAccountValidate,
  verifyOwnerShipValidate,
  brandsValidate,
  contactValidate,
  serviceProductsValidate,
  bankDetailValidate,
  disclosureValidate,
  reverifyAccounttValidate,
  termsConditionValidate,
  getUnnNumberValidate
};
