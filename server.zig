const std = @import("std");
const http = std.http;
const ArrayList = std.ArrayList([]u8);
const u8list = std.ArrayList(u8);
const json = std.json;
var musicDir: std.fs.Dir = undefined;


pub fn readDirJson(allocator: std.mem.Allocator) ![]u8 {

    var w = try musicDir.walk(allocator);
    defer w.deinit();

    var list = u8list.init(allocator);
    defer list.deinit();

    var jwriter = json.writeStream(list.writer(), .{ .whitespace = .indent_1});
    defer jwriter.deinit();

    try jwriter.beginArray();

    while(try w.next()) |n| {
        if(n.kind == .directory){
            continue;
        }
    
        if(std.mem.count(u8, n.basename , ".mp3") > 0){

            const nameLen = std.mem.indexOf(u8, n.basename, ".mp3");
        try jwriter.beginObject();
            try jwriter.objectField("path");
            try jwriter.write(n.path);
            try jwriter.objectField("name");

            if(nameLen) |u|{
                try jwriter.write(n.basename[0..u]);
            }else {
                try jwriter.write(n.basename);
            }

        try jwriter.endObject();
        }
    }

    try jwriter.endArray();

    return try allocator.dupe(u8, list.items);
}

pub fn writeFileToResponse(response: *http.Server.Response) !void {

            var cleanedFilename : [1000]u8 = undefined;
            @memset(&cleanedFilename, 0);

            // for filenames with spaces
            _ = std.mem.replace(u8, response.request.target[1..], "%20", " ", &cleanedFilename);

            std.debug.print("cleaned => {s}\n", .{cleanedFilename});

            const file = musicDir.openFile(std.mem.sliceTo(&cleanedFilename, 0), .{ .mode = .read_only}) catch {
                response.status = .not_found;
                try response.send();
                return;
            };

            defer file.close();

            response.transfer_encoding = .{ .content_length = (try file.stat()).size };
            try response.headers.append("connection", "close");
            try response.send();

            var bur: [1024]u8 = undefined;
            var r:usize = 0;
            while(true){
                
                r = try file.read(&bur);
                if(r == 0) break;
                response.writer().writeAll(bur[0..r]) catch {
                    continue;
                };
                
            }
    
}

pub fn writefileToStream(file: std.fs.File, writer: anytype) !void {
    var bur: [1024]u8 = undefined;
    var r:usize = 0;
    while(true){
        
        r = try file.read(&bur);
        if(r == 0) break;
        writer.writeAll(bur[0..r]) catch {
            continue;
        };
        
    }
}


var port: u16 = undefined;

pub fn main() !void {

    if(std.os.argv.len < 3){
         std.debug.print("Usage: server <port> <absolute path to dir>\n", .{});
        return;
    }

    port = std.fmt.parseInt(u16, std.mem.sliceTo(std.os.argv[1], 10), 0) catch {
        std.debug.print("Usage: server <port> <absolute path to dir>\n", .{});
        return;
    };

    if(std.fs.path.isAbsolute(std.mem.sliceTo(std.os.argv[2], 0))){} else {
         std.debug.print("Usage: server <port> <absolute path to dir>\n", .{});
        return;
    }

    musicDir = std.fs.openDirAbsoluteZ(std.os.argv[2], .{ .iterate = true }) catch {
        std.debug.print("Error opening Dirctory {s}\n", .{std.os.argv[2]});
        return;
    };

    defer musicDir.close();

    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    var server = http.Server.init(allocator, .{ .reuse_address = true, .reuse_port = true});
    defer server.deinit();

    const address = try std.net.Address.parseIp("127.0.0.1", port);

    try server.listen(address);

    std.debug.print("server on port {}\n", .{address.getPort()});

    while(true){

        var response = try server.accept(.{ .allocator = allocator, .header_strategy = .{ .dynamic = 4096 }});
        defer response.deinit();

        try response.wait();

        std.debug.print("{s}\n", .{ response.request.target });

        if(std.mem.eql(u8, "/", response.request.target)){

            const thisDir = std.fs.cwd();
            const file = try thisDir.openFile("web/page.html", .{ .mode = .read_only});

            response.transfer_encoding = .{ .content_length = (try file.stat()).size };
            try response.headers.append("content-type", "text/html");
            try response.headers.append("connection", "close");
            try response.send();

            var bur: [1024]u8 = undefined;
            var r:usize = 0;
            while(true){
                
                r = try file.read(&bur);
                if(r == 0) break;
                response.writer().writeAll(bur[0..r]) catch {
                    break;
                };
                
            }

        }else if(std.mem.eql(u8, "/web/main.js", response.request.target)){

            var thisDir = std.fs.cwd();
            var file = try thisDir.openFile("web/main.js", .{ .mode = .read_only});

            defer {
                file.close();
            }

            response.transfer_encoding = .{ .content_length = (try file.stat()).size };
            try response.headers.append("content-type", "application/javascript");
            try response.headers.append("connection", "close");
            try response.send();

            try writefileToStream(file, response.writer());

        } else if(std.mem.eql(u8, "/songs", response.request.target )){

            const jsn = try readDirJson(allocator);
            defer allocator.free(jsn);

            response.transfer_encoding = .{ .content_length = jsn.len };
            try response.headers.append("content-type", "application/javascript");
            try response.headers.append("connection", "close");
            try response.send();
            try response.writer().writeAll(jsn);


        } else {
            try writeFileToResponse(&response);
        }
    }
}
