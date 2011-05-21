require 'rubygems'
require 'mail'
require 'mustache'

hostname = `hostname`.strip

options = { :address => hostname,
            :port    => 25,
            :domain  => hostname
          }
Mail.defaults do
  delivery_method :smtp, options
end

mail = Mail.new Mustache.render(File.read('test.eml'), :hostname => hostname)

1.times do
  fork do
    mail.deliver!
  end
end