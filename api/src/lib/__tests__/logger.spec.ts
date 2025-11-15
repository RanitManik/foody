// Mock winston
jest.mock("winston", () => ({
    createLogger: jest.fn(),
    format: {
        timestamp: jest.fn(),
        errors: jest.fn(),
        json: jest.fn(),
        combine: jest.fn(() => jest.fn()), // Return a function
        colorize: jest.fn(),
        simple: jest.fn(),
    },
    transports: {
        Console: jest.fn(() => ({})), // Return an object
    },
}));

interface MockLogger {
    error: jest.Mock;
    warn: jest.Mock;
    info: jest.Mock;
    debug: jest.Mock;
}

describe("Logger Utilities", () => {
    let mockLogger: MockLogger;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create a mock logger instance
        mockLogger = {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
        };

        // Mock winston.createLogger to return our mock logger
        const winston = require("winston");
        (winston.createLogger as jest.Mock).mockReturnValue(mockLogger);
    });

    describe("logger", () => {
        it("should create logger with correct configuration", () => {
            // Import the module to trigger logger creation
            require("../shared/logger");

            const winston = require("winston");
            expect(winston.createLogger).toHaveBeenCalledWith({
                level: "info", // default LOG_LEVEL
                format: expect.any(Function), // combine function
                defaultMeta: { service: "foody-api" },
                transports: [expect.any(Object)], // Console transport
            });
        });
    });

    describe("log convenience methods", () => {
        it("should export log object with convenience methods", () => {
            // Test that the log object exists and has the expected methods
            const loggerModule = require("../shared/logger");
            expect(loggerModule.log).toBeDefined();
            expect(typeof loggerModule.log.error).toBe("function");
            expect(typeof loggerModule.log.warn).toBe("function");
            expect(typeof loggerModule.log.info).toBe("function");
            expect(typeof loggerModule.log.debug).toBe("function");
        });
    });
});
