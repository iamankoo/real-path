export type SignupInput = {
  name: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email?: string;
  identifier?: string;
  password?: string;
};

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const readJsonObjectBody = async <T extends Record<string, unknown>>(
  request: Request,
) => {
  try {
    const body = (await request.json()) as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: "Request body must be a JSON object." };
    }

    return { value: body as Partial<T> };
  } catch {
    return { error: "Request body must be valid JSON." };
  }
};

export const validateSignupInput = (body: Partial<SignupInput>) => {
  const name = String(body.name || "").trim();
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");

  const missing = [
    ["full name", name],
    ["email id", email],
    ["password", password],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    return { error: `Please fill all mandatory fields: ${missing.map(([label]) => label).join(", ")}.` };
  }

  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  return {
    value: {
      name,
      email,
      password,
    },
  };
};

export const validateLoginInput = (body: Partial<LoginInput>) => {
  const email = normalizeEmail(String(body.email || body.identifier || ""));
  const password = String(body.password || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!isValidEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  return {
    value: {
      email,
      password,
    },
  };
};
